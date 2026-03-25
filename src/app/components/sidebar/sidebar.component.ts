import { Component, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../services/canvas.service';
import { PRESETS } from '../../models/canvas.model';

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [CommonModule],
    template: `
    <div class="sidebar-shell">
    
      <!-- Icon Rail -->
      <nav class="icon-rail">
        @for (item of navItems; track item) {
          <div
            class="nav-item"
            [class.active]="activeTab === item.id"
            (click)="toggleTab(item.id)"
            [title]="item.label"
            >
            <div class="nav-icon" [innerHTML]="item.icon"></div>
            <span class="nav-label">{{ item.label }}</span>
          </div>
        }
      </nav>
    
      <!-- Content Panel -->
      @if (activeTab) {
        <div class="content-panel">
          <!-- TEMPLATES -->
          @if (activeTab === 'templates') {
            <div class="panel-head">Templates</div>
            <button class="ai-gen-btn" (click)="openAiModal.emit()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              Describe your design…
            </button>
            <div class="section-label">Quick Start</div>
            <div class="preset-grid">
              @for (p of presets; track p; let i = $index) {
                <div class="preset-card" (click)="cs.loadPreset(i)">
                  <div class="preset-thumb" [style.background]="p.bg">
                    <span class="preset-name">{{ p.name }}</span>
                  </div>
                </div>
              }
            </div>
          }
          <!-- TEXT -->
          @if (activeTab === 'text') {
            <div class="panel-head">Text</div>
            <div class="section-label">Add Text</div>
            <div class="text-add-card heading-card" (click)="addText('heading')">
              <span style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif">Add a heading</span>
            </div>
            <div class="text-add-card subhead-card" (click)="addText('subheading')">
              <span style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif">Add a subheading</span>
            </div>
            <div class="text-add-card body-card" (click)="addText('body')">
              <span style="font-size:12px">Add a little bit of body text</span>
            </div>
            <div class="section-label" style="margin-top:16px">Styles</div>
            <div class="text-style-list">
              @for (s of textStyles; track s) {
                <div class="text-style-item" (click)="addStyledText(s)">
                  <span [style.font-family]="s.ff" [style.font-size.px]="s.preview" [style.font-weight]="s.fw">{{ s.name }}</span>
                  <span class="text-style-meta">{{ s.ff }}</span>
                </div>
              }
            </div>
          }
          <!-- IMAGES -->
          @if (activeTab === 'images') {
            <div class="panel-head">Images</div>
            <button class="upload-btn" (click)="triggerUpload()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Image
            </button>
            <button class="upload-btn ai" (click)="openImgModal.emit()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              AI Image Generator
            </button>
            <button class="upload-btn" (click)="addImgPlaceholder()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Add Placeholder
            </button>
            <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileChange($event)" />
          }
          <!-- SHAPES -->
          @if (activeTab === 'shapes') {
            <div class="panel-head">Shapes</div>
            <div class="section-label">Basic Shapes</div>
            <div class="shape-grid">
              @for (s of shapes; track s) {
                <div class="shape-item" (click)="addShape(s)" [title]="s.label">
                  <div class="shape-preview" [ngStyle]="shapeStyle(s)"></div>
                  <span class="shape-label">{{ s.label }}</span>
                </div>
              }
            </div>
            <div class="section-label">Color Fills</div>
            <div class="color-fills">
              @for (c of fillColors; track c) {
                <div class="fill-chip" (click)="addColorRect(c)" [style.background]="c"></div>
              }
            </div>
          }
          <!-- LAYERS -->
          @if (activeTab === 'layers') {
            <div class="panel-head">Layers</div>
            @if (!cs.elements().length) {
              <div class="layers-info">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.3">
                  <rect x="2" y="7" width="20" height="4" rx="1"/>
                  <rect x="2" y="13" width="20" height="4" rx="1"/>
                </svg>
                <p>No layers yet.<br>Add elements from the left sidebar.</p>
              </div>
            }
            @for (el of reversedElements; track el; let i = $index) {
              <div
                class="layer-item"
                [class.active]="el.id === cs.selectedId()"
                (click)="cs.selectedId.set(el.id)"
                >
                <div class="layer-type-icon">
                  @switch (el.type) {
                    @case ('text') {
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                      </svg>
                    }
                    @case ('img') {
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    }
                    @default {
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                    }
                  }
                </div>
                <span class="layer-name">{{ getLayerName(el) }}</span>
                @if (el.locked) {
                  <span class="layer-lock">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 11H6v10h12V11z"/><path d="M12 2a4 4 0 0 0-4 4v5h8V6a4 4 0 0 0-4-4z"/>
                    </svg>
                  </span>
                }
                <div class="layer-actions">
                  <button class="layer-btn" (click)="cs.deleteElement(el.id); $event.stopPropagation()" title="Delete">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          }
          <!-- UPLOADS -->
          @if (activeTab === 'uploads') {
            <div class="panel-head">Uploads</div>
            <button class="upload-btn big" (click)="triggerUpload()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Files
            </button>
            <p class="upload-hint">Supported: PNG, JPG, GIF, SVG, WebP</p>
            <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileChange($event)" />
          }
        </div>
      }
    </div>
    `,
    styles: [`
    .sidebar-shell {
      display: flex;
      height: 100%;
      flex-shrink: 0;
    }

    /* Icon Rail */
    .icon-rail {
      width: 68px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 0;
      gap: 2px;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .nav-item {
      width: 56px; border-radius: 10px;
      padding: 9px 4px 7px;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
      cursor: pointer; color: var(--muted);
      transition: all .15s;
      &:hover { background: var(--panel); color: var(--text); }
      &.active { background: var(--panel); color: var(--accent); }
    }
    .nav-icon {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      svg { width: 20px; height: 20px; }
    }
    .nav-label {
      font-family: 'Syne', sans-serif;
      font-size: 8.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
      text-align: center; line-height: 1.1;
    }

    /* Content Panel */
    .content-panel {
      width: 234px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      overflow-y: auto; flex-shrink: 0;
      padding: 0 10px 16px;
      animation: slideIn .15s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .panel-head {
      font-family: 'Syne', sans-serif; font-weight: 800;
      font-size: 14px; color: var(--text);
      padding: 14px 2px 10px; position: sticky; top: 0;
      background: var(--surface); z-index: 1;
      border-bottom: 1px solid var(--border);
      margin: 0 -10px; padding: 14px 12px 10px;
      margin-bottom: 10px;
    }
    .section-label {
      font-size: 9.5px; font-family: 'Syne', sans-serif;
      font-weight: 700; color: var(--muted);
      letter-spacing: .08em; text-transform: uppercase;
      margin: 12px 0 8px;
    }

    /* AI gen btn */
    .ai-gen-btn {
      width: 100%; height: 36px; border-radius: 9px;
      border: none; background: linear-gradient(135deg,#7c5cfc,#9b6bfc);
      color: #fff; font-family: 'Syne', sans-serif;
      font-weight: 700; font-size: 11.5px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin-bottom: 10px; cursor: pointer;
      &:hover { opacity: .9; }
    }

    /* Presets */
    .preset-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .preset-card {
      aspect-ratio: 3/4; border-radius: 9px; overflow: hidden;
      cursor: pointer; border: 2px solid transparent;
      transition: all .18s;
      &:hover { border-color: var(--accent); transform: translateY(-2px); }
    }
    .preset-thumb {
      width: 100%; height: 100%;
      display: flex; align-items: flex-end; justify-content: flex-start;
      padding: 8px;
    }
    .preset-name {
      font-family: 'Syne', sans-serif; font-weight: 700; font-size: 7.5px;
      color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.6);
      background: rgba(0,0,0,.3); border-radius: 3px; padding: 2px 5px;
    }

    /* Text */
    .text-add-card {
      width: 100%; border-radius: 9px;
      background: var(--panel); border: 1.5px solid var(--border);
      padding: 12px 14px; margin-bottom: 6px;
      cursor: pointer; display: flex; align-items: center;
      color: var(--text); transition: all .15s;
      &:hover { border-color: var(--accent); }
    }
    .text-style-list { display: flex; flex-direction: column; gap: 4px; }
    .text-style-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px; border-radius: 8px;
      background: var(--panel); border: 1px solid var(--border);
      cursor: pointer; transition: all .15s;
      &:hover { border-color: var(--accent); }
    }
    .text-style-meta { font-size: 9px; color: var(--muted); }

    /* Upload */
    .upload-btn {
      width: 100%; padding: 10px 14px;
      background: var(--panel); border: 1.5px solid var(--border);
      border-radius: 9px; color: var(--text); font-size: 12.5px;
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; margin-bottom: 7px; transition: all .15s;
      font-family: 'DM Sans', sans-serif;
      &:hover { border-color: var(--accent); }
      &.ai { background: rgba(124,92,252,.1); border-color: rgba(124,92,252,.3); color: #a57bff; }
      &.big { flex-direction: column; padding: 22px 14px; justify-content: center; font-size: 13px; }
    }
    .upload-hint { font-size: 10px; color: var(--muted); text-align: center; margin-top: 4px; }

    /* Shapes */
    .shape-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
    }
    .shape-item {
      aspect-ratio: 1; border-radius: 8px;
      background: var(--panel); border: 1px solid var(--border);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 4px; cursor: pointer; transition: all .15s;
      padding: 6px;
      &:hover { border-color: var(--accent); }
    }
    .shape-preview { width: 28px; height: 28px; }
    .shape-label { font-size: 8px; color: var(--muted); font-family: 'Syne', sans-serif; font-weight: 700; }

    .color-fills {
      display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px;
    }
    .fill-chip {
      width: 30px; height: 30px; border-radius: 6px;
      cursor: pointer; transition: transform .15s;
      border: 2px solid transparent;
      &:hover { transform: scale(1.15); border-color: rgba(255,255,255,.3); }
    }

    /* Layers */
    .layers-info {
      text-align: center; padding: 30px 10px; color: var(--muted);
      svg { margin-bottom: 8px; }
      p { font-size: 11px; line-height: 1.6; }
    }
    .layer-item {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 8px; border-radius: 7px;
      cursor: pointer; border: 1px solid transparent;
      margin-bottom: 2px; transition: all .15s;
      &:hover { background: var(--panel); }
      &.active { background: var(--panel); border-color: var(--accent); }
    }
    .layer-type-icon {
      width: 22px; height: 22px; border-radius: 5px;
      background: var(--border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: var(--muted);
    }
    .layer-name { flex: 1; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .layer-lock { color: var(--muted); font-size: 10px; flex-shrink: 0; }
    .layer-actions { opacity: 0; transition: opacity .15s; }
    .layer-item:hover .layer-actions { opacity: 1; }
    .layer-btn {
      width: 20px; height: 20px; border-radius: 4px;
      border: none; background: transparent; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
      &:hover { background: rgba(252,92,125,.2); color: #fc5c7d; }
    }
  `]
})
export class SidebarComponent {
  @Output() openAiModal = new EventEmitter<void>();
  @Output() openImgModal = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  activeTab: string | null = 'templates';
  presets = PRESETS;

  navItems: NavItem[] = [
    { id: 'templates', label: 'Templates', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>` },
    { id: 'text', label: 'Text', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>` },
    { id: 'images', label: 'Images', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` },
    { id: 'shapes', label: 'Shapes', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17" cy="7" r="4"/><polygon points="12,21 3,21 7.5,14"/><rect x="13" y="14" width="8" height="7" rx="1"/></svg>` },
    { id: 'uploads', label: 'Uploads', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>` },
    { id: 'layers', label: 'Layers', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>` },
  ];

  shapes = [
    { label: 'Rect', bg: '#7c5cfc', w: 200, h: 120, radius: 0, shape: 'rect' },
    { label: 'Circle', bg: '#fc5c7d', w: 150, h: 150, radius: 999, shape: 'circle' },
    { label: 'Rounded', bg: '#10b981', w: 200, h: 120, radius: 20, shape: 'rounded' },
    { label: 'Line', bg: '#3e3e54', w: 300, h: 4, radius: 2, shape: 'line' },
    { label: 'Triangle', bg: '#f59e0b', w: 150, h: 130, radius: 0, shape: 'triangle' },
    { label: 'Star', bg: '#f59e0b', w: 140, h: 140, radius: 0, shape: 'star' },
    { label: 'Heart', bg: '#fc5c7d', w: 140, h: 130, radius: 0, shape: 'heart' },
    { label: 'Diamond', bg: '#6366f1', w: 120, h: 140, radius: 0, shape: 'diamond' },
  ];

  fillColors = [
    '#7c5cfc', '#fc5c7d', '#10b981', '#f59e0b',
    '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899',
    '#14b8a6', '#f97316', '#1a1a24', '#eeeef8',
  ];

  textStyles = [
    { name: 'Bold Headline', ff: 'Syne', fw: 800, fontSize: 48, preview: 14 },
    { name: 'Subheading', ff: 'Syne', fw: 700, fontSize: 28, preview: 13 },
    { name: 'Body Copy', ff: 'DM Sans', fw: 400, fontSize: 16, preview: 12 },
    { name: 'Caption', ff: 'DM Sans', fw: 400, fontSize: 12, preview: 11 },
    { name: 'Serif Title', ff: 'Georgia', fw: 700, fontSize: 42, preview: 13 },
    { name: 'Mono Code', ff: 'Courier', fw: 400, fontSize: 14, preview: 11 },
  ];

  constructor(public cs: CanvasService) { }

  toggleTab(id: string) {
    this.activeTab = this.activeTab === id ? null : id;
  }

  get reversedElements() { return [...this.cs.elements()].reverse(); }

  shapeStyle(s: any) {
    const base: any = {
      background: s.bg,
      width: '28px', height: '28px',
      borderRadius: s.shape === 'circle' ? '50%' : s.shape === 'rounded' ? '6px' : s.shape === 'line' ? '2px' : '3px',
    };
    if (s.shape === 'line') { base.height = '4px'; base.marginTop = '12px'; }
    return base;
  }

  addText(style: string) {
    const map: Record<string, any> = {
      heading: { fontSize: 48, fontWeight: 800, text: 'Heading Text', fontFamily: 'Syne', color: '#222222' },
      subheading: { fontSize: 28, fontWeight: 700, text: 'Subheading', fontFamily: 'Syne', color: '#222222' },
      body: { fontSize: 16, fontWeight: 400, text: 'Body text here', fontFamily: 'DM Sans', color: '#444444' },
      caption: { fontSize: 12, fontWeight: 400, text: 'Caption text', fontFamily: 'DM Sans', color: '#888888' },
    };
    const cw = this.cs.canvasWidth();
    this.cs.addElement({ type: 'text', x: Math.round(cw * 0.1), y: 100, w: Math.round(cw * 0.8), align: 'left', ...map[style] });
  }

  addStyledText(s: any) {
    const cw = this.cs.canvasWidth();
    this.cs.addElement({
      type: 'text', x: Math.round(cw * 0.1), y: 100, w: Math.round(cw * 0.8), align: 'left',
      fontSize: s.fontSize, fontWeight: s.fw, text: s.name, fontFamily: s.ff, color: '#222222'
    });
  }

  addShape(s: any) {
    const cw = this.cs.canvasWidth();
    const ch = this.cs.canvasHeight();
    this.cs.addElement({ type: 'rect', x: Math.round(cw * 0.3), y: Math.round(ch * 0.3), w: s.w, h: s.h, bg: s.bg, radius: s.radius });
  }

  addColorRect(color: string) {
    const cw = this.cs.canvasWidth();
    const ch = this.cs.canvasHeight();
    this.cs.addElement({ type: 'rect', x: Math.round(cw * 0.3), y: Math.round(ch * 0.3), w: 200, h: 120, bg: color, radius: 0 });
  }

  addImgPlaceholder() {
    const cw = this.cs.canvasWidth();
    const ch = this.cs.canvasHeight();
    this.cs.addElement({ type: 'img', x: Math.round(cw * 0.15), y: Math.round(ch * 0.15), w: Math.round(cw * 0.5), h: Math.round(ch * 0.3), src: null });
  }

  triggerUpload() {
    const fi = document.querySelector('app-sidebar input[type=file]') as HTMLInputElement;
    fi?.click();
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const cw = this.cs.canvasWidth();
      const ch = this.cs.canvasHeight();
      this.cs.addElement({
        type: 'img', x: Math.round(cw * 0.1), y: Math.round(ch * 0.1),
        w: Math.round(cw * 0.6), h: Math.round(ch * 0.4), src: ev.target?.result as string
      });
    };
    reader.readAsDataURL(file);
    (e.target as HTMLInputElement).value = '';
  }

  getLayerName(el: any): string {
    if (el.type === 'text') return (el.text || 'Text').slice(0, 20);
    if (el.type === 'img') return 'Image';
    return 'Shape';
  }
}
