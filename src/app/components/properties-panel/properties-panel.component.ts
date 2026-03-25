import { Component, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../services/canvas.service';
import { CanvasElement, TextElement, RectElement, ImgElement } from '../../models/canvas.model';

interface BgPreset { label: string; value: string; }

@Component({
    selector: 'app-properties-panel',
    imports: [FormsModule],
    templateUrl: './properties-panel.component.html',
    styleUrl: './properties-panel.component.scss',
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
