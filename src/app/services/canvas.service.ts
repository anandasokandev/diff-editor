import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  CanvasElement, RectElement, TextElement, ImgElement,
  specToElement, uid, PRESETS
} from '../models/canvas.model';

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private readonly STORAGE_KEY = 'tempeditor-canvas-state';

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

  /** True when a canvas has already been initialised (safe to close the New Design modal). */
  hasExistingCanvas = computed(() => this.elements().length > 0 || this.canvasWidth() !== 1080 || this.canvasHeight() !== 1080);

  // ── URL param signals (set once at startup, readable by any component)
  urlKeywords = signal<string>('');
  urlStyle = signal<string>('bold');
  urlGenerateImage = signal<boolean>(true);
  /**
   * True whenever keywords are supplied in the URL.
   * The permission popup in AppComponent guards actual generation,
   * so this is safe to set even when saved state already exists.
   */
  shouldAutoGenerate = false;

  constructor(private http: HttpClient) {
    // Load saved state on app startup
    const saved = this.loadCanvasState();
    if (saved) {
      this.applyCanvasState(saved);
    }

    // If width & height are passed as URL query params (e.g. opened as a popup
    // from another project), skip the setup modal and go straight to the canvas.
    const params = new URLSearchParams(window.location.search);
    const qw = parseInt(params.get('width') ?? '', 10);
    const qh = parseInt(params.get('height') ?? '', 10);
    const qKeys = (params.get('keywords') ?? '').trim();
    const qStyle = params.get('style') ?? 'bold';
    const qImage = params.get('image');

    if (qKeys) this.urlKeywords.set(qKeys);
    if (qStyle) this.urlStyle.set(qStyle);
    if (qImage === 'no') this.urlGenerateImage.set(false);

    if (qw > 0 && qh > 0) {
      if (saved) {
        // Existing canvas state — just hide the modal and sync dimensions without
        // wiping elements (preserves user's work across refreshes).
        this.showSetup.set(false);
        this.canvasWidth.set(qw);
        this.canvasHeight.set(qh);
        const qName = params.get('name');
        if (qName) this.templateName.set(qName);
        this.fitZoom(qw, qh);
      } else {
        // No prior state — first load via popup
        const qName = params.get('name') ?? 'Untitled Design';
        this.initTemplate(qName, qw, qh);
      }
    } else if (!saved) {
      // No width/height but also no saved state — treat as direct open, keep setup modal
    }

    // Show the AI permission popup whenever keywords are present in the URL.
    // The popup itself prevents unwanted generation (user must confirm).
    if (qKeys) this.shouldAutoGenerate = true;
  }

  public getCanvasState() {
    return {
      elements: this.elements(),
      canvasWidth: this.canvasWidth(),
      canvasHeight: this.canvasHeight(),
      templateName: this.templateName(),
      canvasBg: this.canvasBg(),
      zoom: this.zoom(),
      showSetup: this.showSetup(),
    };
  }

  private saveCanvasState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.getCanvasState()));
    } catch (err) {
      console.warn('Could not save canvas state to localStorage', err);
    }
  }

  private loadCanvasState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Could not load saved canvas state', err);
      return null;
    }
  }

  clearCanvasState() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (err) {
      console.warn('Could not clear saved canvas state', err);
    }
  }

  public getLayerName(el: any): string {
    if (el.type === 'text') return (el.text || 'Text').slice(0, 20) || 'Text';
    if (el.type === 'img') return 'Image';
    return 'Shape';
  }

  /** Returns an enriched JSON object for external use/logging */
  public exportCanvasJSON() {
    return {
      canvasWidth: this.canvasWidth(),
      canvasHeight: this.canvasHeight(),
      canvasName: this.templateName(),
      canvasBg: this.canvasBg(),
      elements: this.elements().map(el => {
        // Enforce a height for images/rects, or estimate for text
        const h = (el as any).h || (el.type === 'text' ? (el as any).fontSize * 1.4 : 0);
        return {
          ...el,
          width: el.w,
          height: Math.round(h),
          layerName: this.getLayerName(el),
          content: el.type === 'text' ? (el as any).text : (el.type === 'img' ? (el as any).src : 'Shape Content')
        };
      })
    };
  }

  private applyCanvasState(state: any) {
    if (!state) return;
    this.canvasWidth.set(state.canvasWidth ?? 1080);
    this.canvasHeight.set(state.canvasHeight ?? 1080);
    this.templateName.set(state.templateName ?? 'Untitled Design');
    this.canvasBg.set(state.canvasBg ?? '#ffffff');
    this.zoom.set(typeof state.zoom === 'number' ? state.zoom : 0.75);
    this.showSetup.set(state.showSetup ?? false);
    if (Array.isArray(state.elements)) {
      this.elements.set(state.elements);
    }
    this.selectedId.set(null);
    this.editingId.set(null);
  }

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
    this.saveCanvasState();
  }

  setCanvasBg(bg: string) {
    this.canvasBg.set(bg);
    this.saveCanvasState();
  }

  setElements(els: CanvasElement[]) {
    this.elements.set(els);
    this.selectedId.set(null);
    this.editingId.set(null);
    this.saveCanvasState();
  }

  fitZoom(w: number, h: number) {
    const availW = window.innerWidth * 0.68;
    const availH = window.innerHeight * 0.80;
    const z = Math.min(availW / w, availH / h, 1.5);
    this.zoom.set(Math.max(0.1, parseFloat(z.toFixed(2))));
    this.saveCanvasState();
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

    this.setElements(els);
  }

  // ── Element CRUD
  addElement(spec: any): CanvasElement | null {
    const el = specToElement(spec);
    if (!el) return null;
    this.elements.update(els => [...els, el]);
    this.selectedId.set(el.id);
    this.saveCanvasState();
    return el;
  }

  updateElement(id: string, patch: Partial<CanvasElement>) {
    this.elements.update(els =>
      els.map(e => e.id === id ? { ...e, ...patch } as CanvasElement : e)
    );
    this.saveCanvasState();
  }

  deleteElement(id: string) {
    this.elements.update(els => els.filter(e => e.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
    this.saveCanvasState();
  }

  duplicateElement(id: string) {
    const src = this.elements().find(e => e.id === id);
    if (!src) return;
    const copy: CanvasElement = { ...src, id: uid(), x: src.x + 20, y: src.y + 20 } as CanvasElement;
    this.elements.update(els => [...els, copy]);
    this.selectedId.set(copy.id);
    this.saveCanvasState();
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
    this.saveCanvasState();
  }

  setImageSrc(id: string, src: string) {
    this.updateElement(id, { src } as any);
  }

  clearCanvas() {
    this.elements.set([]);
    this.selectedId.set(null);
    this.editingId.set(null);
    this.saveCanvasState();
  }

  // ── Zoom helpers
  zoomIn() { this.zoom.update(z => Math.min(3, parseFloat((z + 0.1).toFixed(2)))); this.saveCanvasState(); }
  zoomOut() { this.zoom.update(z => Math.max(0.1, parseFloat((z - 0.1).toFixed(2)))); this.saveCanvasState(); }
  zoomReset() { this.fitZoom(this.canvasWidth(), this.canvasHeight()); }
}
