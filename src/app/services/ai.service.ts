import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ── Estimated height for a text element
function estimateTextHeight(el: any): number {
  const lines = Math.max(1, (el.text || '').split('\n').length);
  const lineH = (el.fontSize || 24) * 1.4;
  return Math.max(lines * lineH + 12, 28);
}

// ── Get bounding box of any element
function bbox(el: any): { x: number; y: number; w: number; h: number } {
  const h = el.type === 'text' ? estimateTextHeight(el) : (el.h || 0);
  return { x: el.x, y: el.y, w: el.w, h };
}

// ── Check if two boxes overlap (with padding)
function overlaps(a: any, b: any, pad = 6): boolean {
  const ba = bbox(a);
  const bb = bbox(b);
  return (
    ba.x < bb.x + bb.w + pad &&
    ba.x + ba.w + pad > bb.x &&
    ba.y < bb.y + bb.h + pad &&
    ba.y + ba.h + pad > bb.y
  );
}

// ── Clamp element inside canvas bounds (now takes dynamic dims)
function clamp(el: any, CW: number, CH: number): any {
  const h = el.type === 'text' ? estimateTextHeight(el) : (el.h || 0);
  return {
    ...el,
    x: Math.max(0, Math.min(CW - el.w, el.x)),
    y: Math.max(0, Math.min(CH - h, el.y)),
  };
}

// ── Background detection (uses dynamic dims)
function isBackground(el: any, CW: number, CH: number): boolean {
  return !!(el.locked && el.x <= 10 && el.y <= 10 && el.w >= CW - 20 && (el.h || 0) >= CH - 20);
}

/**
 * Post-process AI layout:
 * 1. Clamp all elements inside canvas (dynamic dims)
 * 2. Sort non-bg elements by y
 * 3. Push each element down past any overlap
 */
function resolveOverlaps(layout: any[], CW: number, CH: number): any[] {
  if (!layout?.length) return layout;

  const isBg = (el: any) => isBackground(el, CW, CH);

  const bg = layout.filter(isBg).map(el => clamp(el, CW, CH));
  const moveable = layout.filter(el => !isBg(el)).map(el => clamp(el, CW, CH));

  moveable.sort((a, b) => a.y - b.y);

  const placed: any[] = [...bg];

  for (let el of moveable) {
    let attempts = 0;
    while (attempts < 400) {
      const conflict = placed.find(p => !isBg(p) && overlaps(el, p, 8));
      if (!conflict) break;
      const conflictBottom = conflict.y + (conflict.type === 'text'
        ? estimateTextHeight(conflict) : (conflict.h || 0));
      el = { ...el, y: conflictBottom + 10 };
      attempts++;
    }

    el = clamp(el, CW, CH);

    const elH = el.type === 'text' ? estimateTextHeight(el) : (el.h || 0);
    if (el.y + elH > CH) {
      el = { ...el, y: Math.max(0, CH - elH - 8) };
    }

    placed.push(el);
  }

  return [
    ...placed.filter(isBg),
    ...placed.filter(el => !isBg(el)).sort((a, b) => a.y - b.y),
  ];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private http: HttpClient) { }

  async callClaude(system: string, userMsg: string): Promise<string> {
    const body = {
      contents: [{ parts: [{ text: userMsg }] }],
      systemInstruction: { parts: [{ text: system }] }
    };

    const data: any = await firstValueFrom(
      this.http.post('http://localhost:3000/api/claude', body)
    );

    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateImage(prompt: string, w = 400, h = 400): Promise<string> {
    const body = {
      contents: [{ parts: [{ text: `${prompt} (size ${w}x${h})` }] }]
    };

    const data: any = await firstValueFrom(
      this.http.post('http://localhost:3000/api/image', body)
    );
    if (data.error) throw new Error(data.error.message || 'Image API error');

    const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) throw new Error('No image data returned');
    return `data:image/png;base64,${b64}`;
  }

  loadPollinationsImage(prompt: string, w = 400, h = 400) {
    return this.generateImage(prompt, w, h);
  }

  async generateImgVariants(prompt: string, count = 3): Promise<(string | null)[]> {
    const results: (string | null)[] = [];
    for (let i = 0; i < count; i++) {
      try {
        results.push(await this.generateImage(prompt, 512, 512));
      } catch {
        results.push(null);
      }
    }
    return results;
  }

  /** Parse raw AI JSON + apply overlap resolver using the actual canvas dimensions. */
  parseAndFixLayout(raw: string, CW: number, CH: number): any[] {
    const clean = raw.replace(/```json|```/g, '').trim();
    const m = clean.match(/\[[\s\S]*\]/);
    const layout = JSON.parse(m ? m[0] : clean);
    return resolveOverlaps(layout, CW, CH);
  }

  /**
   * Build the system prompt dynamically using actual canvas dimensions.
   * @param style  Visual style key
   * @param CW     Canvas pixel width  (from CanvasService)
   * @param CH     Canvas pixel height (from CanvasService)
   */
  buildDesignSystemPrompt(style: string, CW: number, CH: number): string {
    const styleDescs: Record<string, string> = {
      bold: 'Strong contrast, vivid bold colors, heavy impactful typography, dramatic',
      minimal: 'Generous white space, clean restrained typography, subtle muted palette',
      elegant: 'Luxury aesthetic, gold or dark tones, serif fonts, sophisticated refined',
      playful: 'Bright joyful colors, rounded friendly shapes, energetic fun typography',
      dark: 'Very dark background, vivid neon accents, dramatic deep shadows, cinematic',
      retro: 'Warm muted vintage tones, retro display fonts, nostalgic grainy texture feel',
    };

    // Dynamic layout hints — scale the suggested zone positions to actual canvas size
    const ratio = CH / 800;          // scale factor relative to original 800px reference
    const heroH = Math.round(260 * (CW / 600));
    const heroY = 0;
    const titleY = heroY + heroH + 14;
    const titleH = Math.round(150 * ratio);
    const subY = titleY + titleH + 14;
    const subH = Math.round(46 * ratio);
    const divY = subY + subH + 14;
    const divH = Math.round(50 * ratio);
    const bodyY = divY + divH + 14;
    const bodyH = Math.round(60 * ratio);
    const ctaRY = bodyY + bodyH + 14;
    const ctaRH = Math.round(50 * ratio);
    const ctaTY = ctaRY + 6;
    const ctaTH = Math.round(37 * ratio);

    const sideMargin = Math.round(CW * 0.067); // ~6.7% of width
    const textMinX = sideMargin;
    const textMaxX = CW - sideMargin;

    return `You are an expert graphic designer AI. Output ONLY a valid JSON array of canvas elements for a ${CW}×${CH}px canvas. No markdown, no explanation, only the JSON array.

ELEMENT TYPES:
1. {"type":"rect","x":N,"y":N,"w":N,"h":N,"bg":"#hex or linear-gradient(...)","radius":N,"locked":bool}
2. {"type":"text","x":N,"y":N,"w":N,"text":"...","color":"#hex","fontSize":N,"fontWeight":N,"fontFamily":"Syne|DM Sans|Georgia|Courier","align":"left|center|right"}
3. {"type":"img","x":N,"y":N,"w":N,"h":N,"aiPrompt":"very descriptive image generation prompt"}

STRICT NO-OVERLAP RULES:
- Canvas: ${CW}px wide, ${CH}px tall. Every element: x>=0, y>=0, x+w<=${CW}, y+h<=${CH}.
- Element [0]: background rect {type:"rect",x:0,y:0,w:${CW},h:${CH},locked:true,...}
- NO two non-background elements may overlap. Check every pair.
- TEXT HEIGHT FORMULA: fontSize × 1.4 × lineCount + 12. Use this to plan y positions.
  Examples: fontSize:${Math.round(64 * ratio)} 2-lines = ${Math.round(64 * ratio)}×1.4×2+12 = ${Math.round(64 * ratio * 1.4 * 2) + 12}px tall
            fontSize:${Math.round(32 * ratio)} 1-line  = ${Math.round(32 * ratio)}×1.4×1+12 = ${Math.round(32 * ratio * 1.4) + 12}px tall
            fontSize:${Math.round(18 * ratio)} 1-line  = ${Math.round(18 * ratio)}×1.4×1+12 = ${Math.round(18 * ratio * 1.4) + 12}px tall
- Always add minimum 14px gap between the bottom of one element and the top of the next.
- Horizontal: text x>=${textMinX}, x+w<=${textMaxX} (side margins minimum).

SUGGESTED ZONE LAYOUT for ${CW}×${CH} (adjust to fit your content):
  [0]  y:0      h:${CH}    → background (locked, fills entire canvas)
  [1]  y:${heroY}  h:${heroH}  → hero image (img type, full width or padded)
  [2]  y:${titleY} h:~${titleH} → main headline text (large font, allow for multiline)
  [3]  y:${subY}   h:~${subH}  → subheading (medium font, 1 line)
  [4]  y:${divY}   h:${divH}   → accent rect / divider
  [5]  y:${bodyY}  h:~${bodyH} → body copy text (small font, 2-3 lines)
  [6]  y:${ctaRY}  h:${ctaRH}  → CTA button rect
  [7]  y:${ctaTY}  h:~${ctaTH} → CTA label text (centered over button)

You may reorder zones but the bottom of each element + 14px must be <= top of the next element.
The background MUST cover the full ${CW}×${CH} canvas.

Style: ${styleDescs[style] || styleDescs['bold']}`;
  }
}
