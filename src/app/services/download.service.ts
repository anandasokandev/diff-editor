import { Injectable } from '@angular/core';
import { CanvasService } from './canvas.service';
import { CanvasElement, RectElement, TextElement, ImgElement, getFontFamily } from '../models/canvas.model';

@Injectable({ providedIn: 'root' })
export class DownloadService {

  constructor(private cs: CanvasService) { }

  /**
   * Renders the design to a PNG at EXACT template pixel dimensions
   * using the browser's native Canvas 2D API — completely zoom/DOM-independent.
   *
   * Rendering pipeline:
   *   1. Create an off-screen <canvas> at canvasWidth × canvasHeight
   *   2. Fill with canvasBg (supports solid colours AND CSS gradients via a
   *      temporary div + getComputedStyle conversion trick)
   *   3. Draw every element in z-order: rects, images, text
   *   4. Export as PNG and trigger browser download
   */
  async downloadAsPng(
    _ignored: HTMLElement,
    filename = 'craftly-design.png'
  ): Promise<void> {
    const nativeEl = this.cs.canvasNativeEl;
    if (!nativeEl) {
      await this.downloadFallback(filename);
      return;
    }

    // Save and clear selection so resize handles & outlines aren't captured
    const prevSelectedId = this.cs.selectedId();
    const prevEditingId = this.cs.editingId();
    this.cs.selectedId.set(null);
    this.cs.editingId.set(null);

    // We must wait a tiny bit for Angular to update the DOM (removing classes/handles)
    await new Promise(r => setTimeout(r, 50));

    try {
      const html2canvas = (await import('html2canvas')).default;

      // Temporarily remove CSS scale to capture at natural 1:1 size
      const wrapper = nativeEl.parentElement as HTMLElement;
      const prevTransform = wrapper?.style.transform ?? '';
      if (wrapper) wrapper.style.transform = 'scale(1)';

      const capturedCanvas = await html2canvas(nativeEl, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });

      // Restore CSS scale & UI selection immediately
      if (wrapper) wrapper.style.transform = prevTransform;
      this.cs.selectedId.set(prevSelectedId);
      this.cs.editingId.set(prevEditingId);

      const dataUrl = capturedCanvas.toDataURL('image/png', 1.0);
      this.sendToParent(dataUrl);

      capturedCanvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    } catch (e) {
      console.warn('html2canvas failed, falling back', e);

      // Restore state
      this.cs.selectedId.set(prevSelectedId);
      this.cs.editingId.set(prevEditingId);
      const wrapper = nativeEl.parentElement as HTMLElement;
      if (wrapper && wrapper.style.transform === 'scale(1)') {
        wrapper.style.transform = `scale(${this.cs.zoom()})`; // fallback restore
      }

      await this.downloadFallback(filename);
    }
  }

  private async downloadFallback(filename: string): Promise<void> {
    const CW = this.cs.canvasWidth();
    const CH = this.cs.canvasHeight();
    const bg = this.cs.canvasBg();
    const els = this.cs.elements();

    const oc = document.createElement('canvas');
    oc.width = CW;
    oc.height = CH;
    const ctx = oc.getContext('2d')!;

    await this.drawBackground(ctx, CW, CH, bg);

    for (const el of els) {
      try {
        if (el.type === 'rect') await this.drawRect(ctx, el as RectElement);
        if (el.type === 'text') this.drawText(ctx, el as TextElement);
        if (el.type === 'img') await this.drawImg(ctx, el as ImgElement);
      } catch (e) {
        console.warn('Element render failed', el, e);
      }
    }

    const dataUrl = oc.toDataURL('image/png', 1.0);
    this.sendToParent(dataUrl);

    oc.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  }

  /** Broadcasts the exported image data back to the parent window or opener if it exists. */
  private sendToParent(dataUrl: string) {
    const payload = { type: 'CRAFTLY_EXPORT', dataUrl };
    // If opened via window.open()
    if (window.opener && window.opener !== window) {
      window.opener.postMessage(payload, '*');
    }
    // If embedded inside an iframe
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Background
  // ────────────────────────────────────────────────────────────────────────────

  private async drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, bg: string) {
    if (bg.includes('gradient')) {
      const fill = this.parseCssGradient(ctx, bg, w, h);
      if (fill) {
        ctx.fillStyle = fill;
      } else {
        ctx.fillStyle = '#ffffff';
      }
    } else {
      ctx.fillStyle = bg || '#ffffff';
    }
    ctx.fillRect(0, 0, w, h);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Rect element
  // ────────────────────────────────────────────────────────────────────────────

  private async drawRect(ctx: CanvasRenderingContext2D, el: RectElement) {
    const { x, y, w } = el;
    const h = el.h ?? 0;
    const radius = el.radius ?? 0;

    ctx.save();

    // Rounded rect path
    this.roundRect(ctx, x, y, w, h, radius);

    if (el.bg?.includes('gradient')) {
      const g = this.parseCssGradient(ctx, el.bg, w, h, x, y);
      ctx.fillStyle = g ?? '#cccccc';
    } else {
      ctx.fillStyle = el.bg || '#cccccc';
    }

    ctx.fill();
    ctx.restore();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Text element
  // ────────────────────────────────────────────────────────────────────────────

  private drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
    const { x, y, w } = el;
    const fontSize = el.fontSize ?? 24;
    const fontWeight = el.fontWeight ?? 400;
    const color = el.color ?? '#000000';
    const align = (el.align as CanvasTextAlign) ?? 'left';
    const fontFamily = getFontFamily(el.fontFamily ?? 'DM Sans').split(',')[0].trim().replace(/'/g, '');

    // Mirror the CSS padding on .text-el: padding: 4px 6px
    const padX = 6;  // horizontal padding (left & right)
    const padY = 4;  // vertical padding (top)

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    // Compute the x anchor for alignment — mirrors CSS text-align within the padded content box
    const innerW = w - padX * 2;  // content width (element width minus left+right padding)
    let textX: number;
    if (align === 'center') textX = x + padX + innerW / 2;
    else if (align === 'right') textX = x + w - padX;
    else textX = x + padX;  // 'left'

    const lineH = fontSize * 1.4;
    const lines = (el.text ?? '').split('\n');

    // Word-wrap each line to fit within the padded content width
    const wrapped: string[] = [];
    for (const raw of lines) {
      const words = raw.split(' ');
      let cur = '';
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > innerW && cur) {
          wrapped.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) wrapped.push(cur);
    }

    // Clip to element bounds (matching CSS overflow: hidden)
    ctx.beginPath();
    ctx.rect(x, y, w, lineH * wrapped.length + padY * 2 + 2);
    ctx.clip();

    wrapped.forEach((line, i) => {
      ctx.fillText(line, textX, y + padY + i * lineH);
    });

    ctx.restore();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Image element
  // ────────────────────────────────────────────────────────────────────────────

  private drawImg(ctx: CanvasRenderingContext2D, el: ImgElement): Promise<void> {
    return new Promise(resolve => {
      const { x, y, w } = el;
      const h = el.h ?? 0;

      if (!el.src) {
        // Draw placeholder
        ctx.save();
        ctx.fillStyle = '#e8e8f4';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#c0c0d8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        ctx.save();
        this.roundRect(ctx, x, y, w, h, 0);
        ctx.clip();
        // object-fit: cover — compute scale and offset
        const scaleX = w / img.naturalWidth;
        const scaleY = h / img.naturalHeight;
        const scale = Math.max(scaleX, scaleY);
        const sw = img.naturalWidth * scale;
        const sh = img.naturalHeight * scale;
        const ox = x + (w - sw) / 2;
        const oy = y + (h - sh) / 2;
        ctx.drawImage(img, ox, oy, sw, sh);
        ctx.restore();
        resolve();
      };

      img.onerror = () => {
        // Fallback placeholder
        ctx.save();
        ctx.fillStyle = '#e0e0ee';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
        resolve();
      };

      img.src = el.src;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────

  /** Draw a rounded rectangle path (does NOT fill/stroke). */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  /**
   * Parse a CSS linear-gradient() string into a CanvasGradient.
   * Supports the most common patterns: `linear-gradient(angle, #stop, #stop, ...)`
   * Returns null if parsing fails (caller falls back to a solid colour).
   */
  private parseCssGradient(
    ctx: CanvasRenderingContext2D,
    css: string,
    w: number, h: number,
    ox = 0, oy = 0
  ): CanvasGradient | null {
    try {
      // Extract inside parens: linear-gradient(...)
      // Handle multi-stop + nested parens (rgba, hsl) via a greedy match
      const inner = css.replace(/^.*?linear-gradient\(/i, '').replace(/\)\s*$/, '');

      const parts = this.splitGradientParts(inner);
      if (parts.length < 2) return null;

      // First part: angle or "to direction"
      let angleDeg = 180; // default: top→bottom
      let startIdx = 0;
      const first = parts[0].trim();

      if (first.endsWith('deg')) {
        angleDeg = parseFloat(first);
        startIdx = 1;
      } else if (first.startsWith('to ')) {
        const dir = first.toLowerCase();
        if (dir === 'to right') angleDeg = 90;
        else if (dir === 'to left') angleDeg = 270;
        else if (dir === 'to bottom') angleDeg = 180;
        else if (dir === 'to top') angleDeg = 0;
        else if (dir === 'to bottom right') angleDeg = 135;
        else if (dir === 'to bottom left') angleDeg = 225;
        startIdx = 1;
      }

      // Convert angle to start/end coordinates
      const rad = (angleDeg - 90) * (Math.PI / 180);
      const len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
      const cx = ox + w / 2;
      const cy = oy + h / 2;
      const x0 = cx - (Math.cos(rad) * len) / 2;
      const y0 = cy - (Math.sin(rad) * len) / 2;
      const x1 = cx + (Math.cos(rad) * len) / 2;
      const y1 = cy + (Math.sin(rad) * len) / 2;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);

      const stops = parts.slice(startIdx);
      stops.forEach((stop, i) => {
        const s = stop.trim();
        // Colour with optional position: "#abc 30%"
        const pctMatch = s.match(/\s+([\d.]+)%\s*$/);
        const colour = pctMatch ? s.slice(0, pctMatch.index).trim() : s;
        const pos = pctMatch ? parseFloat(pctMatch[1]) / 100 : i / (stops.length - 1);
        grad.addColorStop(Math.min(1, Math.max(0, pos)), colour);
      });

      return grad;
    } catch {
      return null;
    }
  }

  /**
   * Split gradient parts on top-level commas (not inside parentheses).
   * e.g. "135deg, rgba(1,2,3,1), #fff" → ["135deg", "rgba(1,2,3,1)", "#fff"]
   */
  private splitGradientParts(s: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of s) {
      if (ch === '(') { depth++; cur += ch; }
      else if (ch === ')') { depth--; cur += ch; }
      else if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
      else { cur += ch; }
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  }
}
