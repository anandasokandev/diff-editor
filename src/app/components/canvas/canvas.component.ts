import {
  Component, ElementRef, ViewChild, OnDestroy, AfterViewInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { CanvasService } from '../../services/canvas.service';
import { CanvasElement, TextElement, RectElement, ImgElement, getFontFamily } from '../../models/canvas.model';
import { PropertiesPanelComponent } from '../properties-panel/properties-panel.component';

interface DragRef { id: string; sx: number; sy: number; ol: number; ot: number; }
interface RszRef { id: string; dir: string; sx: number; sy: number; ow: number; oh: number; ol: number; ot: number; }
interface PanRef { sx: number; sy: number; sl: number; st: number; }

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, PropertiesPanelComponent],
  template: `
    <div #areaEl class="canvas-area"
         [class.pan-ready]="spaceHeld && !panning"
         [class.grabbing]="panning"
         (mousedown)="onAreaMouseDown($event)"
         (wheel)="onWheel($event)">

      <!-- Dot grid background -->
      <div class="dot-bg"></div>

      <!-- Ruler hints (top + left) -->
      <div class="ruler ruler-h"></div>
      <div class="ruler ruler-v"></div>

      <!-- Canvas wrapper (handles scroll centering) -->
      <div class="canvas-viewport">
        <div class="canvas-wrapper"
          [style.transform]="'scale(' + cs.zoom() + ')'"
          [style.width.px]="cs.canvasWidth()"
          [style.height.px]="cs.canvasHeight()"
        >
          <!-- Design canvas -->
          <div #canvasEl class="design-canvas"
               [style.width.px]="cs.canvasWidth()"
               [style.height.px]="cs.canvasHeight()"
               [style.background]="cs.canvasBg()"
               (mousedown)="onCanvasClick($event)">

            <ng-container *ngFor="let el of cs.elements(); trackBy: trackById">

              <!-- RECT -->
              <div *ngIf="el.type === 'rect'"
                class="canvas-el"
                [class.selected]="el.id === cs.selectedId()"
                [style.left.px]="el.x"
                [style.top.px]="el.y"
                [style.width.px]="el.w"
                [style.height.px]="asRect(el).h"
                [style.border-radius.px]="asRect(el).radius"
                [style.background]="asRect(el).bg"
                [style.cursor]="el.locked ? 'default' : 'move'"
                (mousedown)="onElDown($event, el)">
                <ng-container *ngTemplateOutlet="handles; context:{el}"></ng-container>
              </div>

              <!-- TEXT -->
              <div *ngIf="el.type === 'text'"
                class="canvas-el text-el"
                [class.selected]="el.id === cs.selectedId()"
                [class.editing]="el.id === cs.editingId()"
                [style.left.px]="el.x"
                [style.top.px]="el.y"
                [style.width.px]="el.w"
                [style.font-size.px]="asText(el).fontSize"
                [style.font-weight]="asText(el).fontWeight"
                [style.color]="asText(el).color"
                [style.font-family]="getFf(asText(el).fontFamily)"
                [style.text-align]="asText(el).align"
                [style.cursor]="el.locked ? 'default' : 'move'"
                [contentEditable]="el.id === cs.editingId()"
                (mousedown)="onElDown($event, el)"
                (dblclick)="startEdit(el)"
                (blur)="endEdit($event, el)">
                {{ el.id !== cs.editingId() ? asText(el).text : null }}
                <ng-container *ngTemplateOutlet="handles; context:{el}"></ng-container>
              </div>

              <!-- IMG -->
              <div *ngIf="el.type === 'img'"
                class="canvas-el img-el"
                [class.selected]="el.id === cs.selectedId()"
                [style.left.px]="el.x"
                [style.top.px]="el.y"
                [style.width.px]="el.w"
                [style.height.px]="asImg(el).h"
                [style.cursor]="el.locked ? 'default' : 'move'"
                (mousedown)="onElDown($event, el)">
                <img *ngIf="asImg(el).src" [src]="asImg(el).src" />
                <div *ngIf="!asImg(el).src" class="img-placeholder" (click)="clickPlaceholder(el, $event)">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span>Click to upload</span>
                </div>
                <ng-container *ngTemplateOutlet="handles; context:{el}"></ng-container>
              </div>

            </ng-container>
          </div>
        </div>

        <!-- Page label under canvas -->
        <div class="page-label">Page 1 of 1</div>
      </div>

      <!-- Top-right floating: canvas size info + layer controls -->
      <div class="canvas-topbar">
        <div class="canvas-info">
          <span class="canvas-size-badge">{{ cs.canvasWidth() }} × {{ cs.canvasHeight() }} px</span>
          <button class="ctrl-btn" (click)="cs.zoomOut()" title="Zoom out">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <span class="zoom-val">{{ Math.round(cs.zoom() * 100) }}%</span>
          <button class="ctrl-btn" (click)="cs.zoomIn()" title="Zoom in">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <div class="sep"></div>
          <button class="ctrl-btn" (click)="cs.zoomReset(); centerScroll()" title="Fit to screen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </div>

        <!-- Layer controls (when element selected) -->
        <div class="layer-ctrls" *ngIf="cs.selectedId()">
          <button class="ctrl-btn" title="Move up" (click)="cs.moveLayer(cs.selectedId()!, 1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
          <button class="ctrl-btn" title="Move down" (click)="cs.moveLayer(cs.selectedId()!, -1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
          <button class="ctrl-btn" title="Duplicate" (click)="cs.duplicateElement(cs.selectedId()!)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="ctrl-btn delete" title="Delete (Del)" (click)="cs.deleteElement(cs.selectedId()!)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Right-side Properties Panel — always visible -->
      <div class="right-panel-wrap">
        <app-properties-panel (openImgModal)="onOpenImgModal($event)" />
      </div>

      <!-- Bottom center: + Add page -->
      <div class="bottom-bar">
        <div class="page-dots">
          <div class="page-dot active"></div>
        </div>
        <button class="add-page-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add page
        </button>
      </div>

      <!-- Hidden file input -->
      <input #fileInput type="file" accept="image/*" style="display:none" (change)="onPlaceholderFile($event)" />
    </div>

    <!-- HANDLES TEMPLATE -->
    <ng-template #handles let-el="el">
      <div *ngIf="el.id === cs.selectedId()" class="handles">
        <div class="rh nw" (mousedown)="onRszDown($event, el, 'nw')"></div>
        <div class="rh n"  (mousedown)="onRszDown($event, el, 'n')"></div>
        <div class="rh ne" (mousedown)="onRszDown($event, el, 'ne')"></div>
        <div class="rh e"  (mousedown)="onRszDown($event, el, 'e')"></div>
        <div class="rh se" (mousedown)="onRszDown($event, el, 'se')"></div>
        <div class="rh s"  (mousedown)="onRszDown($event, el, 's')"></div>
        <div class="rh sw" (mousedown)="onRszDown($event, el, 'sw')"></div>
        <div class="rh w"  (mousedown)="onRszDown($event, el, 'w')"></div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex: 1; overflow: hidden; }

    .canvas-area {
      flex: 1;
      background: #0e0e14;
      /* Use overflow scroll so we have real scroll room for panning */
      overflow: auto;
      position: relative;
      /* hide scrollbars visually — panning is the scroll mechanism */
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar { display: none; }
      &.pan-ready { cursor: grab !important; }
      &.pan-ready * { cursor: grab !important; pointer-events: none; }
      &.grabbing  { cursor: grabbing !important; }
      &.grabbing  * { cursor: grabbing !important; pointer-events: none; }
    }

    .dot-bg {
      position: fixed; inset: 0;
      background-image: radial-gradient(circle, #1e1e2e 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      pointer-events: none;
      z-index: 0;
    }

    /* Rulers */
    .ruler {
      position: fixed; background: #13131a; z-index: 10; pointer-events: none;
    }
    .ruler-h { top: 52px; left: 68px; right: 0; height: 18px; border-bottom: 1px solid #252535; }
    .ruler-v { top: 70px; left: 68px; bottom: 40px; width: 18px; border-right: 1px solid #252535; }

    /* Viewport / wrapper — large padding creates scroll room for pan in every direction */
    .canvas-viewport {
      display: inline-flex;   /* shrink-wraps content so padding creates actual overflow */
      flex-direction: column;
      align-items: center;
      gap: 20px;
      z-index: 1;
      /* 600px pad gives plenty of pan space in every direction */
      padding: 600px 800px;
    }

    .canvas-wrapper {
      transform-origin: center center;
      flex-shrink: 0;
    }

    .design-canvas {
      /* background is set dynamically via [style.background]="cs.canvasBg()" */
      box-shadow: 0 8px 60px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4);
      position: relative;
      overflow: hidden;
      user-select: none;
    }

    .page-label {
      font-size: 11px; color: #3e3e5a;
      font-family: 'Syne', sans-serif;
      letter-spacing: .04em;
    }

    /* Canvas top-bar overlay */
    .canvas-topbar {
      position: fixed;
      top: 70px; right: 14px;
      display: flex; flex-direction: column; gap: 6px;
      z-index: 50;
    }
    .canvas-info {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 9px; padding: 5px 8px;
      display: flex; align-items: center; gap: 4px;
    }
    .canvas-size-badge {
      font-size: 10px; color: var(--muted);
      font-family: 'Syne', sans-serif; margin-right: 4px;
      white-space: nowrap;
    }
    .sep { width: 1px; height: 16px; background: var(--border); margin: 0 2px; }

    .layer-ctrls {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 9px; padding: 5px 8px;
      display: flex; align-items: center; gap: 3px;
      animation: popIn .12s ease;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: 1; transform: scale(1); }
    }

    .ctrl-btn {
      width: 26px; height: 26px; border-radius: 6px;
      border: none; background: transparent; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .12s;
      &:hover { background: var(--panel); color: var(--text); }
      &.delete:hover { background: rgba(252,92,125,.15); color: #fc5c7d; }
    }
    .zoom-val {
      font-size: 10.5px; color: var(--text);
      font-family: 'Syne', sans-serif; min-width: 34px; text-align: center;
    }

    /* Right panel float */
    .right-panel-wrap {
      position: fixed;
      top: 70px;
      right: 0;
      bottom: 40px;
      z-index: 40;
      animation: slideRight .15s ease;
    }
    @keyframes slideRight {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* Bottom bar */
    .bottom-bar {
      position: fixed;
      bottom: 0; left: 68px; right: 0;
      height: 40px;
      background: var(--surface);
      border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      gap: 14px;
      z-index: 50;
    }
    .page-dots { display: flex; gap: 6px; }
    .page-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--border);
      &.active { background: var(--accent); }
    }
    .add-page-btn {
      height: 26px; padding: 0 10px;
      border-radius: 6px; border: 1px solid var(--border);
      background: transparent; color: var(--muted);
      font-size: 11px; display: flex; align-items: center; gap: 5px;
      font-family: 'DM Sans', sans-serif;
      &:hover { background: var(--panel); color: var(--text); border-color: var(--accent); }
    }

    /* Canvas Elements */
    .canvas-el {
      position: absolute; outline: none;
      animation: fadeIn .15s ease;
      &.selected { outline: 2px solid var(--accent); outline-offset: 1px; }
      &:hover:not(.selected) { outline: 1.5px dashed rgba(124,92,252,.5); outline-offset: 1px; }
    }
    .text-el {
      min-height: 28px; padding: 4px 6px;
      word-break: break-word; white-space: pre-wrap; line-height: 1.25;
      &.editing {
        cursor: text;
        background: rgba(124,92,252,.06);
        outline: 2px solid var(--accent) !important;
      }
    }
    .img-el {
      overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; display: block; }
    }
    .img-placeholder {
      width: 100%; height: 100%;
      background: linear-gradient(135deg,#e8e8f4,#d4d4e8);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 8px; color: #888; font-size: 12px; cursor: pointer;
      svg { opacity: .3; }
    }

    /* Resize handles */
    .handles { position: absolute; inset: 0; pointer-events: none; }
    .rh {
      position: absolute;
      width: 9px; height: 9px;
      background: #fff;
      border: 2px solid var(--accent);
      border-radius: 2px;
      pointer-events: all;
      z-index: 999;
    }
    .rh.nw { top:-5px; left:-5px; cursor:nw-resize; }
    .rh.n  { top:-5px; left:calc(50% - 4px); cursor:n-resize; }
    .rh.ne { top:-5px; right:-5px; cursor:ne-resize; }
    .rh.e  { right:-5px; top:calc(50% - 4px); cursor:e-resize; }
    .rh.se { bottom:-5px; right:-5px; cursor:se-resize; }
    .rh.s  { bottom:-5px; left:calc(50% - 4px); cursor:s-resize; }
    .rh.sw { bottom:-5px; left:-5px; cursor:sw-resize; }
    .rh.w  { left:-5px; top:calc(50% - 4px); cursor:w-resize; }
  `]
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
