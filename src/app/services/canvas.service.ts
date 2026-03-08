import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  CanvasElement, RectElement, TextElement, ImgElement,
  specToElement, uid, PRESETS
} from '../models/canvas.model';

@Injectable({ providedIn: 'root' })
export class CanvasService {
  // ── State signals
  elements = signal<CanvasElement[]>([]);
  selectedId = signal<string | null>(null);
  zoom = signal(0.75);
  editingId = signal<string | null>(null);

  // ── Canvas / Template metadata
  canvasWidth = signal(1080);
  canvasHeight = signal(1080);
  templateName = signal('Untitled Design');
  canvasBg = signal<string>('#ffffff');   // ← canvas background fill

  // ── Setup screen flag
  showSetup = signal(true);

  // ── Native canvas DOM element (set by CanvasComponent after view init)
  canvasNativeEl: HTMLElement | null = null;

  selectedElement = computed(() =>
    this.elements().find(e => e.id === this.selectedId()) ?? null
  );

  constructor(private http: HttpClient) { }

  // ── Initialize with template config
  initTemplate(name: string, w: number, h: number) {
    this.templateName.set(name);
    this.canvasWidth.set(w);
    this.canvasHeight.set(h);
    this.canvasBg.set('#ffffff');
    this.elements.set([]);
    this.selectedId.set(null);
    this.editingId.set(null);
    this.showSetup.set(false);
    this.fitZoom(w, h);
  }

  setCanvasBg(bg: string) { this.canvasBg.set(bg); }

  fitZoom(w: number, h: number) {
    const availW = window.innerWidth * 0.68;
    const availH = window.innerHeight * 0.80;
    const z = Math.min(availW / w, availH / h, 1.5);
    this.zoom.set(Math.max(0.1, parseFloat(z.toFixed(2))));
  }

  // ── Preset loading
  loadPreset(idx: number) {
    const preset = PRESETS[idx];
    const w = this.canvasWidth();
    const h = this.canvasHeight();
    const scaleX = w / 600;
    const scaleY = h / 800;

    const els = preset.els.map(s => {
      if (!s) return null;
      // Scale preset (designed for 600x800) to actual canvas size
      const scaled = {
        ...s,
        x: s.x != null ? Math.round(s.x * scaleX) : 0,
        y: s.y != null ? Math.round(s.y * scaleY) : 0,
        w: s.w != null ? Math.round(s.w * scaleX) : 100,
        h: (s as any).h != null ? Math.round((s as any).h * scaleY) : undefined,
      };
      return specToElement(scaled);
    }).filter(Boolean) as CanvasElement[];

    // Apply the preset background to canvasBg so the canvas is fully filled
    const bgSpec = preset.els.find((s: any) =>
      s?.type === 'rect' && s.locked && s.x <= 10 && s.y <= 10
    ) as any;
    if (bgSpec?.bg) this.canvasBg.set(bgSpec.bg);

    this.elements.set(els);
    this.selectedId.set(null);
    this.editingId.set(null);
  }

  // ── Element CRUD
  addElement(spec: any): CanvasElement | null {
    const el = specToElement(spec);
    if (!el) return null;
    this.elements.update(els => [...els, el]);
    this.selectedId.set(el.id);
    return el;
  }

  updateElement(id: string, patch: Partial<CanvasElement>) {
    this.elements.update(els =>
      els.map(e => e.id === id ? { ...e, ...patch } as CanvasElement : e)
    );
  }

  deleteElement(id: string) {
    this.elements.update(els => els.filter(e => e.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
  }

  duplicateElement(id: string) {
    const src = this.elements().find(e => e.id === id);
    if (!src) return;
    const copy: CanvasElement = { ...src, id: uid(), x: src.x + 20, y: src.y + 20 } as CanvasElement;
    this.elements.update(els => [...els, copy]);
    this.selectedId.set(copy.id);
  }

  moveLayer(id: string, dir: 1 | -1) {
    this.elements.update(els => {
      const arr = [...els];
      const i = arr.findIndex(e => e.id === id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  setImageSrc(id: string, src: string) {
    this.updateElement(id, { src } as any);
  }

  clearCanvas() {
    this.elements.set([]);
    this.selectedId.set(null);
  }

  // ── Zoom helpers
  zoomIn() { this.zoom.update(z => Math.min(3, parseFloat((z + 0.1).toFixed(2)))); }
  zoomOut() { this.zoom.update(z => Math.max(0.1, parseFloat((z - 0.1).toFixed(2)))); }
  zoomReset() { this.fitZoom(this.canvasWidth(), this.canvasHeight()); }
}
