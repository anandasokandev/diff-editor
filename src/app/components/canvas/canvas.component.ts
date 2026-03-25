import {
  Component, ElementRef, ViewChild, OnDestroy, AfterViewInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { CanvasService } from '../../services/canvas.service';
import { CanvasElement, TextElement, RectElement, ImgElement, getFontFamily } from '../../models/canvas.model';
import { PropertiesPanelComponent } from '../properties-panel/properties-panel.component';
import { style } from '@angular/animations';

interface DragRef { id: string; sx: number; sy: number; ol: number; ot: number; }
interface RszRef { id: string; dir: string; sx: number; sy: number; ow: number; oh: number; ol: number; ot: number; }
interface PanRef { sx: number; sy: number; sl: number; st: number; }

@Component({
    selector: 'app-canvas',
    imports: [CommonModule, PropertiesPanelComponent],
    templateUrl: './canvas.component.html',
    styleUrl: './canvas.component.scss',
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLDivElement>;
  @ViewChild('areaEl') areaEl!: ElementRef<HTMLDivElement>;

  Math = Math;

  // ── Pan state
  panning = false;
  spaceHeld = false;
  private pan: PanRef | null = null;

  // ── Element drag / resize state
  private drag: DragRef | null = null;
  private rsz: RszRef | null = null;
  private placeholderTargetId: string | null = null;

  private mouseMoveHandler = this.onMouseMove.bind(this);
  private mouseUpHandler = this.onMouseUp.bind(this);

  constructor(public cs: CanvasService, private sanitizer: DomSanitizer) {
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
  }

  ngAfterViewInit() {
    this.cs.canvasNativeEl = this.canvasEl.nativeElement;

    // Middle-mouse-button pan — must be on the native element
    this.areaEl.nativeElement.addEventListener('mousedown', this.onMiddleDown.bind(this));
    // Prevent the browser's default middle-mouse autoscroll icon
    this.areaEl.nativeElement.addEventListener('auxclick', (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    });

    // Center the scroll so the canvas appears in the middle of the pan area on load
    setTimeout(() => this.centerScroll(), 0);
  }

  /** Scroll the canvas-area so the design canvas sits centered in the viewport. */
  centerScroll() {
    const area = this.areaEl?.nativeElement;
    if (!area) return;
    // scrollWidth/Height include the full content (canvas + 600px padding)
    // We want the center of the content to be in the center of the viewport
    area.scrollLeft = (area.scrollWidth - area.clientWidth) / 2;
    area.scrollTop = (area.scrollHeight - area.clientHeight) / 2;
  }

  ngOnDestroy() {
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
  }

  trackById(_: number, el: CanvasElement) { return el.id; }

  asRect(el: CanvasElement) { return el as RectElement; }
  asText(el: CanvasElement) { return el as TextElement; }
  asImg(el: CanvasElement) { return el as ImgElement; }
  getFf(f: string) { return getFontFamily(f); }

  // ─── Area mousedown: decides between pan-start and deselect ───────────────
  onAreaMouseDown(e: MouseEvent) {
    const t = e.target as HTMLElement;
    const isBg = t.classList.contains('canvas-area')
      || t.classList.contains('dot-bg')
      || t.classList.contains('canvas-viewport')
      || t.classList.contains('page-label');

    // Left-button + Space held  →  pan
    if (e.button === 0 && this.spaceHeld) {
      e.preventDefault();
      this.startPan(e);
      return;
    }

    // Left-button on background (no element, no space)  →  deselect + pan
    if (e.button === 0 && isBg) {
      this.cs.selectedId.set(null);
      this.cs.editingId.set(null);
      this.startPan(e);   // background drag also pans
      return;
    }
  }

  onCanvasClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.cs.selectedId.set(null);
      this.cs.editingId.set(null);
    }
  }

  // Middle-mouse button — fires on the native element to catch button === 1
  private onMiddleDown(e: MouseEvent) {
    if (e.button === 1) {
      e.preventDefault();
      this.startPan(e);
    }
  }

  private startPan(e: MouseEvent) {
    const area = this.areaEl.nativeElement;
    this.pan = { sx: e.clientX, sy: e.clientY, sl: area.scrollLeft, st: area.scrollTop };
    this.panning = true;
  }

  onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) this.cs.zoomIn();
      else this.cs.zoomOut();
    }
  }

  onElDown(e: MouseEvent, el: CanvasElement) {
    if (el.locked) return;
    if ((e.target as HTMLElement).classList.contains('rh')) return;
    if (el.id === this.cs.editingId()) return;
    e.stopPropagation();
    this.cs.selectedId.set(el.id);
    this.drag = { id: el.id, sx: e.clientX, sy: e.clientY, ol: el.x, ot: el.y };
  }

  onRszDown(e: MouseEvent, el: CanvasElement, dir: string) {
    e.stopPropagation(); e.preventDefault();
    if (el.locked) return;
    const h = (el as any).h || 40;
    this.rsz = { id: el.id, dir, sx: e.clientX, sy: e.clientY, ow: el.w, oh: h, ol: el.x, ot: el.y };
    this.cs.selectedId.set(el.id);
  }

  onMouseMove(e: MouseEvent) {
    // ── Pan the viewport ────────────────────────────────────────────────────
    if (this.pan) {
      const area = this.areaEl.nativeElement;
      area.scrollLeft = this.pan.sl - (e.clientX - this.pan.sx);
      area.scrollTop = this.pan.st - (e.clientY - this.pan.sy);
      return; // don't process element drags while panning
    }

    // ── Element drag / resize ───────────────────────────────────────────────
    const z = this.cs.zoom();
    const CW = this.cs.canvasWidth();
    const CH = this.cs.canvasHeight();

    if (this.drag) {
      const dx = (e.clientX - this.drag.sx) / z;
      const dy = (e.clientY - this.drag.sy) / z;
      this.cs.updateElement(this.drag.id, {
        x: Math.max(0, Math.min(CW - 20, this.drag.ol + dx)),
        y: Math.max(0, Math.min(CH - 20, this.drag.ot + dy))
      });
    }
    if (this.rsz) {
      const dx = (e.clientX - this.rsz.sx) / z;
      const dy = (e.clientY - this.rsz.sy) / z;
      const { id, dir, ow, oh, ol, ot } = this.rsz;
      let nw = ow, nh = oh, nl = ol, nt = ot;
      if (dir.includes('e')) nw = Math.max(20, ow + dx);
      if (dir.includes('s')) nh = Math.max(20, oh + dy);
      if (dir.includes('w')) { nw = Math.max(20, ow - dx); nl = ol + ow - nw; }
      if (dir.includes('n')) { nh = Math.max(20, oh - dy); nt = ot + oh - nh; }
      this.cs.updateElement(id, { w: nw, h: nh, x: nl, y: nt } as any);
    }
  }

  onMouseUp() {
    this.drag = null;
    this.rsz = null;
    this.pan = null;
    this.panning = false;
  }

  startEdit(el: CanvasElement) {
    if (el.locked) return;
    this.cs.selectedId.set(el.id);
    this.cs.editingId.set(el.id);
  }

  endEdit(e: FocusEvent, el: CanvasElement) {
    const text = (e.target as HTMLElement).innerText;
    this.cs.updateElement(el.id, { text } as any);
    this.cs.editingId.set(null);
  }

  // Space key held → switch to pan-ready mode
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const active = document.activeElement;
    const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA'
      || (active as HTMLElement).isContentEditable);

    // Space bar → pan-ready cursor (unless typing in an input)
    if (e.code === 'Space' && !inInput) {
      e.preventDefault();
      this.spaceHeld = true;
      return;
    }

    if (inInput) return;

    const sel = this.cs.selectedId();
    if (!sel || this.cs.editingId()) return;

    if (e.key === 'Delete' || e.key === 'Backspace') this.cs.deleteElement(sel);
    if (e.key === 'Escape') { this.cs.selectedId.set(null); this.cs.editingId.set(null); }

    // Arrow key nudge
    const nudge = e.shiftKey ? 10 : 1;
    const el = this.cs.elements().find(x => x.id === sel);
    if (!el) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.cs.updateElement(sel, { x: el.x - nudge }); }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.cs.updateElement(sel, { x: el.x + nudge }); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.cs.updateElement(sel, { y: el.y - nudge }); }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.cs.updateElement(sel, { y: el.y + nudge }); }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      if (!this.pan) this.panning = false; // cursor back to normal if not actively panning
    }
  }

  clickPlaceholder(el: CanvasElement, e: MouseEvent) {
    e.stopPropagation();
    this.placeholderTargetId = el.id;
    this.fileInput.nativeElement.click();
  }

  onPlaceholderFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.placeholderTargetId) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.cs.setImageSrc(this.placeholderTargetId!, ev.target?.result as string);
      this.placeholderTargetId = null;
    };
    reader.readAsDataURL(file);
    (e.target as HTMLInputElement).value = '';
  }

  onOpenImgModal(id: string) {
    // Bubble up - handled by parent
  }
}
