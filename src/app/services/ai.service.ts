import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

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

  // We no longer manually push elements down to avoid overlaps. 
  // We want free-form "Canva-like" layouts with layered text, rects, and images.
  const clamped = layout.map(el => clamp(el, CW, CH));

  // Keep backgrounds at the very bottom, then rects/imgs, then text at the top
  return [
    ...clamped.filter(isBg),
    ...clamped.filter(el => !isBg(el) && el.type !== 'text'),
    ...clamped.filter(el => el.type === 'text')
  ];
}

@Injectable({ providedIn: 'root' })

export class AiService {
  constructor(private http: HttpClient, private auth: AuthService) { }

  async callClaude(system: string, userMsg: string) {
    const body = {
      contents: [{ parts: [{ text: userMsg }] }],
      systemInstruction: { parts: [{ text: system }] }
    };

    const data: any = await firstValueFrom(
      this.http.post('https://localhost:7012/api/Gemini/text', body)
    );

    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateImage(prompt: string, w = 400, h = 400): Promise<string> {
    const body = {
      contents: [{ parts: [{ text: `${prompt} (size ${w}x${h})` }] }]
    };

    // Specify responseType: 'text' because the backend returns a raw URL string, not JSON
    const res = await firstValueFrom(
      this.http.post('https://localhost:7012/api/Gemini/image', body, {
        responseType: 'text' 
      })
    );

    // Clean up quotes if present (some APIs wrap plain text in quotes)
    const url = res.replace(/^"(.*)"$/, '$1').trim();

    if (url && url.startsWith('https')) {
      return url;
    }

    // Fallback: check if it's an error object in string form
    throw new Error('No valid image URL returned from API: ' + url.slice(0, 100));
  }

  loadPollinationsImage(prompt: string, w = 400, h = 400) {
    return this.generateImage(prompt, w, h);
  }

  async generateImgVariants(prompt: string, count = 1): Promise<(string | null)[]> {
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

  buildDesignSystemPrompt(style: string, CW: number, CH: number, generateImage: boolean = true): string {
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

    const imgType = generateImage
      ? `\n3. {"type":"img","x":N,"y":N,"w":N,"h":N,"aiPrompt":"highly descriptive prompt for the image","radius":N}`
      : `\n3. {"type":"img","x":N,"y":N,"w":N,"h":N,"radius":N}`;

    const imgRule = generateImage
      ? `\n- IMAGES & DECORATIONS: Feel free to generate MULTIPLE images via "aiPrompt" (e.g., a person on the left, an abstract decor element on the right). Place them freely!`
      : `\n- IMAGE PLACEHOLDERS: Feel free to include empty image upload placeholders ("type":"img") in your layout. The user will upload their own photos into these boxes manually. Place them creatively!`;

    const imgBorderRule = `Use the new "radius" property on BOTH "img" and "rect" elements`;

    return `You are an expert graphic designer AI. Output ONLY a valid JSON array of canvas elements for a ${CW}×${CH}px canvas. No markdown, no explanation, only the JSON array.

ELEMENT TYPES:
1. {"type":"rect","x":N,"y":N,"w":N,"h":N,"bg":"#hex or linear-gradient(...)","radius":N,"locked":bool}
2. {"type":"text","x":N,"y":N,"w":N,"text":"...","color":"#hex","fontSize":N,"fontWeight":N,"fontFamily":"Syne|DM Sans|Georgia|Courier","align":"left|center|right"}${imgType}

DESIGN RULES:
- Canvas: ${CW}px wide, ${CH}px tall. All elements must fit inside this.
- Element [0]: MUST be the background {type:"rect",x:0,y:0,w:${CW},h:${CH},locked:true,...}.
- TEXT HEIGHT FORMULA: fontSize × 1.4 × lineCount + 12. Ensure text fits nicely. MAX fontSize allowed is 80. Keep text sizes reasonable!
- CANVA-LIKE DYNAMIC COMPOSITION: Do NOT just rigidly stack elements vertically. Be highly creative! You can overlay text on top of rectangles or images. You can place items side by side.${imgRule}
- NO RIGID BORDERS: ${imgBorderRule} for modern, smooth aesthetics (e.g., radius: ${Math.round(24 * ratio)}). Set a massive "radius" (e.g., 999) for perfect circles!
- Ensure good contrast (e.g., white text on a dark background/rect).

Style: ${style}`;
  }
}
