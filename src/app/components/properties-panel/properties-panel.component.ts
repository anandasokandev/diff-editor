import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../services/canvas.service';
import { CanvasElement, TextElement, RectElement, ImgElement } from '../../models/canvas.model';

interface BgPreset { label: string; value: string; }

@Component({
    selector: 'app-properties-panel',
    imports: [CommonModule, FormsModule],
    template: `
    <!-- ═══════════════════ CANVAS BACKGROUND (no element selected) ═══════════════════ -->
    <aside class="panel" *ngIf="!sel">
      <div class="panel-header">
        <span class="panel-title">Canvas Background</span>
      </div>
      <div class="panel-body">

        <div class="sec-label">Solid Color</div>
        <label class="color-row">
          <div class="color-preview" [style.background]="solidColorValue" title="Click to pick color"></div>
          <input type="color" class="color-native" [value]="solidColorValue"
                 (input)="onSolidColorChange($any($event.target).value)" />
          <span class="color-hex">{{ solidColorValue }}</span>
          <span class="color-edit-hint">click to change</span>
        </label>

        <div class="sec-label">Quick Colors</div>
        <div class="quick-colors">
          <div class="q-chip"
               *ngFor="let c of quickColors"
               [style.background]="c"
               [class.active]="cs.canvasBg() === c"
               (click)="cs.setCanvasBg(c)"
               [title]="c">
          </div>
        </div>

        <div class="sec-label">Gradient Presets</div>
        <div class="gradient-grid">
          <div class="grad-card"
               *ngFor="let g of gradientPresets"
               [style.background]="g.value"
               [class.active]="cs.canvasBg() === g.value"
               (click)="cs.setCanvasBg(g.value)"
               [title]="g.label">
            <span class="grad-label">{{ g.label }}</span>
          </div>
        </div>

        <div class="sec-label">Custom Gradient</div>
        <div class="field-full">
          <input class="text-inp" placeholder="e.g. linear-gradient(135deg,#667eea,#764ba2)"
                 [ngModel]="cs.canvasBg()"
                 (ngModelChange)="cs.setCanvasBg($event)" />
        </div>

        <div class="sec-label" style="margin-top:18px">Actions</div>
        <button class="action-full" (click)="cs.setCanvasBg('#ffffff')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          Reset to White
        </button>

      </div>
    </aside>

    <!-- ═══════════════════ ELEMENT PROPERTIES (element selected) ═══════════════════ -->
    <aside class="panel" *ngIf="sel">
      <div class="panel-header">
        <span class="panel-title">{{ headerTitle }}</span>
        <button class="close-btn" (click)="cs.selectedId.set(null)" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="panel-body">

        <!-- Position & Size -->
        <div class="sec-label">Position & Size</div>
        <div class="row">
          <div class="field">
            <span class="lbl">X</span>
            <input type="number" class="inp" [ngModel]="Math.round(sel.x)" (ngModelChange)="cs.updateElement(sel!.id, {x:+$event})">
          </div>
          <div class="field">
            <span class="lbl">Y</span>
            <input type="number" class="inp" [ngModel]="Math.round(sel.y)" (ngModelChange)="cs.updateElement(sel!.id, {y:+$event})">
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="lbl">W</span>
            <input type="number" class="inp" [ngModel]="Math.round(sel.w)" (ngModelChange)="cs.updateElement(sel!.id, {w:+$event})">
          </div>
          <div class="field">
            <span class="lbl">H</span>
            <input type="number" class="inp" [ngModel]="Math.round(getH())" (ngModelChange)="cs.updateElement(sel!.id, {h:+$event})">
          </div>
        </div>

        <!-- TEXT PROPERTIES -->
        <ng-container *ngIf="sel.type === 'text'">
          <div class="sec-label">Typography</div>
          <div class="row">
            <div class="field">
              <span class="lbl">Size</span>
              <input type="number" class="inp" [ngModel]="asText.fontSize" (ngModelChange)="cs.updateElement(sel!.id, {fontSize:+$event})">
            </div>
            <div class="field">
              <span class="lbl">Color</span>
              <input type="color" class="inp color-inp" [ngModel]="asText.color" (ngModelChange)="cs.updateElement(sel!.id, {color:$event})">
            </div>
          </div>
          <div class="field-full">
            <span class="lbl">Weight</span>
            <select class="inp sel-inp" [ngModel]="asText.fontWeight" (ngModelChange)="cs.updateElement(sel!.id, {fontWeight:+$event})">
              <option value="300">Light (300)</option>
              <option value="400">Regular (400)</option>
              <option value="600">SemiBold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">ExtraBold (800)</option>
            </select>
          </div>
          <div class="field-full">
            <span class="lbl">Font</span>
            <select class="inp sel-inp" [ngModel]="asText.fontFamily" (ngModelChange)="cs.updateElement(sel!.id, {fontFamily:$event})">
              <option value="Syne">Syne</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier">Courier New</option>
            </select>
          </div>

          <div class="sec-label">Alignment</div>
          <div class="btn-row">
            <button class="align-btn" [class.active]="asText.align==='left'"   (click)="cs.updateElement(sel!.id, {align:'left'})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
              </svg>
            </button>
            <button class="align-btn" [class.active]="asText.align==='center'" (click)="cs.updateElement(sel!.id, {align:'center'})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/>
              </svg>
            </button>
            <button class="align-btn" [class.active]="asText.align==='right'"  (click)="cs.updateElement(sel!.id, {align:'right'})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </ng-container>

        <!-- RECT PROPERTIES -->
        <ng-container *ngIf="sel.type === 'rect'">
          <div class="sec-label">Fill</div>
          <div class="row">
            <div class="field">
              <span class="lbl">Color</span>
              <input type="color" class="inp color-inp" [ngModel]="rectBgForInput" (ngModelChange)="cs.updateElement(sel!.id, {bg:$event})">
            </div>
          </div>
          <div class="field-full">
            <span class="lbl">Corner Radius</span>
            <div class="range-wrap">
              <input type="range" min="0" max="200" class="range-inp" [ngModel]="asRect.radius" (ngModelChange)="cs.updateElement(sel!.id, {radius:+$event})">
              <span class="range-val">{{ asRect.radius }}px</span>
            </div>
          </div>
          <div class="field-full">
            <span class="lbl">Opacity</span>
            <div class="range-wrap">
              <input type="range" min="0" max="1" step="0.01" class="range-inp" [ngModel]="getOpacity()" (ngModelChange)="setOpacity($event)">
              <span class="range-val">{{ Math.round(getOpacity()*100) }}%</span>
            </div>
          </div>
        </ng-container>

        <!-- IMG PROPERTIES -->
        <ng-container *ngIf="sel.type === 'img'">
          <div class="sec-label">Image</div>
          <button class="action-full" (click)="triggerReplace()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Replace Image
          </button>
          <button class="action-full ai" style="margin-top:6px" (click)="openImgModal.emit(sel!.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            AI Replace
          </button>
          <input #replaceFile type="file" accept="image/*" style="display:none" (change)="onReplaceFile($event)">
        </ng-container>

        <!-- ACTIONS -->
        <div class="sec-label">Actions</div>
        <div class="btn-row actions-row">
          <button class="icon-btn" (click)="cs.duplicateElement(sel!.id)" title="Duplicate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicate
          </button>
          <button class="icon-btn" (click)="cs.updateElement(sel!.id, {locked: !sel!.locked})" title="Lock/Unlock">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11H5v11h14V11z M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            {{ sel!.locked ? 'Unlock' : 'Lock' }}
          </button>
        </div>

        <button class="delete-btn" (click)="cs.deleteElement(sel!.id)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          Delete Element
        </button>

      </div>
    </aside>
  `,
    styles: [`
    .panel {
      width: 230px;
      height: 100%;
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: -4px 0 20px rgba(0,0,0,.3);
    }

    .panel-header {
      padding: 12px 14px 10px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .panel-title {
      font-family: 'Syne', sans-serif;
      font-weight: 700; font-size: 12.5px; color: var(--text);
    }
    .close-btn {
      width: 22px; height: 22px; border-radius: 5px;
      border: none; background: transparent; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
      &:hover { background: var(--panel); color: var(--text); }
    }

    .panel-body {
      flex: 1; overflow-y: auto; padding: 10px 12px 16px;
    }

    .sec-label {
      font-size: 9.5px; font-family: 'Syne', sans-serif;
      font-weight: 700; color: var(--muted);
      letter-spacing: .08em; text-transform: uppercase;
      margin: 13px 0 8px;
      &:first-child { margin-top: 2px; }
    }

    /* Canvas BG controls */
    .color-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .color-preview {
      width: 32px; height: 32px; border-radius: 7px;
      border: 1px solid var(--border); flex-shrink: 0;
      cursor: pointer;
    }
    .color-native {
      width: 0; height: 0; opacity: 0; position: absolute; pointer-events: none;
    }
    .color-hex {
      font-size: 11.5px; color: var(--text);
      font-family: 'Syne', sans-serif; flex: 1;
    }
    /* Make color preview open the native picker on click */
    .color-row { position: relative; }

    .quick-colors {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;
    }
    .q-chip {
      width: 26px; height: 26px; border-radius: 5px;
      cursor: pointer; border: 2px solid transparent;
      transition: transform .12s, border-color .12s;
      &:hover { transform: scale(1.15); }
      &.active { border-color: var(--accent); transform: scale(1.1); }
    }

    .gradient-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 8px;
    }
    .grad-card {
      height: 44px; border-radius: 8px;
      cursor: pointer; border: 2px solid transparent;
      display: flex; align-items: flex-end; padding: 4px 7px;
      transition: all .15s;
      &:hover { transform: translateY(-1px); border-color: rgba(255,255,255,.3); }
      &.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(124,92,252,.3); }
    }
    .grad-label {
      font-size: 8px; font-family: 'Syne', sans-serif; font-weight: 700;
      color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.6);
      background: rgba(0,0,0,.25); border-radius: 3px; padding: 1px 5px;
    }

    .text-inp {
      width: 100%; height: 30px;
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 7px; color: var(--text);
      font-size: 11px; padding: 0 9px; font-family: 'DM Sans', sans-serif;
      &:focus { border-color: var(--accent); }
      &::placeholder { color: var(--muted); }
    }

    /* Element props */
    .row { display: flex; gap: 7px; margin-bottom: 7px; }
    .field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .field-full { display: flex; flex-direction: column; gap: 5px; margin-bottom: 9px; }
    .lbl {
      font-size: 9.5px; color: var(--muted);
      font-family: 'Syne', sans-serif; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
    }

    .inp {
      width: 100%; height: 30px;
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 7px; color: var(--text);
      font-size: 12px; padding: 0 9px; min-width: 0;
      transition: border-color .12s;
      &:focus { border-color: var(--accent); }
      &::-webkit-outer-spin-button, &::-webkit-inner-spin-button { -webkit-appearance: none; }
    }
    .color-inp {
      padding: 2px 4px; cursor: pointer; min-width: 40px;
    }
    .sel-inp {
      appearance: none; -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='%235a5a78'%3E%3Cpath d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 8px center;
      padding-right: 24px;
    }

    .range-wrap { display: flex; align-items: center; gap: 8px; }
    .range-inp {
      flex: 1; height: 3px; padding: 0;
      accent-color: var(--accent);
    }
    .range-val { font-size: 10px; color: var(--muted); min-width: 32px; text-align: right; }

    .btn-row { display: flex; gap: 5px; margin-bottom: 9px; }
    .align-btn {
      flex: 1; height: 30px; border-radius: 7px;
      border: 1px solid var(--border); background: var(--panel);
      color: var(--muted); display: flex; align-items: center; justify-content: center;
      &:hover { border-color: var(--accent); color: var(--text); }
      &.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    }

    .actions-row { gap: 6px; }
    .icon-btn {
      flex: 1; height: 30px; border-radius: 7px;
      border: 1px solid var(--border); background: var(--panel);
      color: var(--muted); font-size: 11px;
      display: flex; align-items: center; justify-content: center; gap: 5px;
      &:hover { border-color: var(--accent); color: var(--text); }
    }

    .action-full {
      width: 100%; padding: 8px 12px;
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); font-size: 12px;
      display: flex; align-items: center; gap: 7px;
      cursor: pointer; transition: all .12s;
      &:hover { border-color: var(--accent); }
      &.ai { background: rgba(124,92,252,.1); border-color: rgba(124,92,252,.3); color: #a57bff; }
    }

    .delete-btn {
      width: 100%; height: 32px; border-radius: 7px;
      border: 1px solid rgba(252,92,125,.3); background: transparent;
      color: #fc5c7d; font-size: 12px; margin-top: 4px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      &:hover { background: rgba(252,92,125,.1); border-color: #fc5c7d; }
    }

    /* BG color-row as a label so click opens native picker */
    label.color-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; margin-bottom: 10px;
      border-radius: 8px; border: 1px solid var(--border);
      background: var(--panel); cursor: pointer;
      position: relative; transition: border-color .12s;
      &:hover { border-color: var(--accent); }
    }
    .color-preview {
      width: 28px; height: 28px; border-radius: 5px;
      border: 1px solid rgba(255,255,255,.12); flex-shrink: 0;
    }
    .color-native {
      position: absolute; opacity: 0; width: 100%; height: 100%;
      left: 0; top: 0; cursor: pointer; border: none; padding: 0;
    }
    .color-hex {
      font-size: 12px; color: var(--text);
      font-family: 'Syne', sans-serif; flex: 1;
    }
    .color-edit-hint {
      font-size: 9px; color: var(--muted);
      font-family: 'Syne', sans-serif; text-transform: uppercase;
      letter-spacing: .06em;
    }
  `]
})
export class PropertiesPanelComponent {
  @Output() openImgModal = new EventEmitter<string>();

  Math = Math;

  quickColors = [
    '#ffffff', '#000000', '#f5f5f5', '#1a1a2e',
    '#e63946', '#f4a261', '#2a9d8f', '#457b9d',
    '#7c5cfc', '#fc5c7d', '#10b981', '#f59e0b',
    '#6366f1', '#ec4899', '#fbbf24', '#3b82f6',
  ];

  gradientPresets: BgPreset[] = [
    { label: 'Twilight', value: 'linear-gradient(135deg,#667eea,#764ba2)' },
    { label: 'Sunrise', value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
    { label: 'Ocean', value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
    { label: 'Forest', value: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
    { label: 'Fire', value: 'linear-gradient(135deg,#fa709a,#fee140)' },
    { label: 'Night', value: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
    { label: 'Peach', value: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
    { label: 'Neon', value: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
    { label: 'Mango', value: 'linear-gradient(135deg,#f6d365,#fda085)' },
    { label: 'Aurora', value: 'linear-gradient(135deg,#89f7fe,#66a6ff)' },
  ];

  constructor(public cs: CanvasService) { }

  get sel(): CanvasElement | null { return this.cs.selectedElement(); }
  get asText(): TextElement { return this.sel as TextElement; }
  get asRect(): RectElement { return this.sel as RectElement; }
  get asImg(): ImgElement { return this.sel as ImgElement; }

  get headerTitle(): string {
    if (!this.sel) return 'Properties';
    if (this.sel.type === 'text') return 'Text Properties';
    if (this.sel.type === 'img') return 'Image Properties';
    return 'Shape Properties';
  }

  /** Returns solid hex color for the native color input (gradients fallback to white) */
  get solidColorValue(): string {
    const bg = this.cs.canvasBg();
    if (bg.startsWith('#') && (bg.length === 4 || bg.length === 7)) return bg;
    if (bg.startsWith('rgb')) {
      const m = bg.match(/\d+/g);
      if (m && m.length >= 3) {
        const hex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${hex(+m[0])}${hex(+m[1])}${hex(+m[2])}`;
      }
    }
    return '#ffffff';
  }

  /** When user picks a solid colour, apply it to the canvas background */
  onSolidColorChange(hex: string) {
    this.cs.setCanvasBg(hex);
  }

  getH(): number {
    if (!this.sel) return 0;
    return (this.sel as any).h || 0;
  }

  get rectBgForInput(): string {
    const bg = this.asRect?.bg || '#7c5cfc';
    return bg.includes('gradient') ? '#7c5cfc' : bg;
  }

  getOpacity(): number {
    const el = document.querySelector('.canvas-el.selected') as HTMLElement | null;
    return el ? parseFloat(el.style.opacity) || 1 : 1;
  }

  setOpacity(v: number) {
    const el = document.querySelector('.canvas-el.selected') as HTMLElement | null;
    if (el) el.style.opacity = String(v);
  }

  triggerReplace() {
    (document.querySelector('app-properties-panel input[type=file]') as HTMLInputElement)?.click();
  }

  onReplaceFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.sel) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.cs.setImageSrc(this.sel!.id, ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    (e.target as HTMLInputElement).value = '';
  }
}
