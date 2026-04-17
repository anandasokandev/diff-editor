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
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss'
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
    return this.cs.getLayerName(el);
  }
}
