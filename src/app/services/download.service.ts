import { Injectable } from '@angular/core';
import { CanvasElement, RectElement, TextElement, ImgElement, getFontFamily } from '../models/canvas.model';

@Injectable({ providedIn: 'root' })
export class DownloadService {

  constructor() { }

  /**
   * Renders the design to a PNG at EXACT template pixel dimensions
   * using a pure Data-to-Canvas 2D pipeline.
   */
  async downloadAsPng(
    els: CanvasElement[],
    CW: number,
    CH: number,
    bg: string,
    filename = 'craftly-design.png'
  ): Promise<void> {
    // Ensure all custom fonts are loaded before we start drawing to canvas
    await document.fonts.ready;

    // 1. Create a pristine off-screen canvas at exact 1:1 scale
    const oc = document.createElement('canvas');
    oc.width = CW;
    oc.height = CH;
    const ctx = oc.getContext('2d', { alpha: false })!;

    // 2. Draw Background
    await this.drawBackground(ctx, CW, CH, bg);

    // 3. Draw Elements in order
    for (const el of els) {
      try {
        if (el.type === 'rect') await this.drawRect(ctx, el as RectElement);
        if (el.type === 'text') this.drawText(ctx, el as TextElement);
        if (el.type === 'img') await this.drawImg(ctx, el as ImgElement);
      } catch (e) {
        console.warn('Manual render failed for element:', el, e);
      }
    }

    // 4. Export and Trigger Download
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

/**
   * Generates a PNG Blob of the current design.
   */
  async exportAsBlob(
    els: CanvasElement[],
    CW: number,
    CH: number,
    bg: string
  ): Promise<Blob> {
    // Ensure fonts and images are fully loaded so we don't capture empty states
    await document.fonts.ready;
    await this.preloadImages(els);

    const oc = document.createElement('canvas');
    oc.width = CW;
    oc.height = CH;
    const ctx = oc.getContext('2d', { alpha: false })!;

    await this.drawBackground(ctx, CW, CH, bg);

    for (const el of els) {
      if (el.type === 'rect') await this.drawRect(ctx, el as RectElement);
      if (el.type === 'text') this.drawText(ctx, el as TextElement);
      if (el.type === 'img') await this.drawImg(ctx, el as ImgElement);
    }

    return new Promise((resolve, reject) => {
      oc.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob generation failed'));
      }, 'image/png', 0.8);
    });
  }

  /** Ensures all image elements in the list are preloaded into memory */
  private async preloadImages(els: CanvasElement[]): Promise<void> {
    const images = els.filter(el => el.type === 'img' && (el as ImgElement).src) as ImgElement[];
    const promises = images.map(imgEl => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imgEl.src!;
      });
    });
    await Promise.all(promises);
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

    // 3. Render lines with a vertical offset to match CSS 'line-height' centering
    const leading = (lineH - fontSize) / 2;

    wrapped.forEach((line, i) => {
      ctx.fillText(line, textX, y + padY + leading + (i * lineH));
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
        const radius = el.radius ?? 0;
        this.roundRect(ctx, x, y, w, h, radius);
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
