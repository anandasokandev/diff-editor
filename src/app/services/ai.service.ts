import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

export interface TemplateCard {
  id: number;
  templateName: string;
  width?: number;       // UI-friendly alias
  height?: number;      // UI-friendly alias
  canvasWidth?: number; // Backend property
  canvasHeight?: number;// Backend property
  canvasBg: string;
  image?: string;       // Original backend field (optional)
  imageUrl?: string;    // Sanitized UI field
  createdAt: string;
  jsonData: any[];
}

@Injectable({ providedIn: "root" })
export class AiService {
  private readonly BASE_URL = 'https://localhost:7012/api';
  private readonly PREVIEW_PREFIX = 'https://pub-f813d597ce8949a68a9e18af239ac4f2.r2.dev';

  constructor(
    private http: HttpClient
  ) { }

  // Fetch all templates belonging to a user (dashboard)
  async getUserTemplates(email: string): Promise<TemplateCard[]> {
    const data: any = await firstValueFrom(
      this.http.get(`${this.BASE_URL}/Template/my-templates`, { params: { email } })
    );

    if (!Array.isArray(data)) return [];

    return data.map(tpl => {
      // Support all common property names (image, imageUrl, fileName, etc.)
      const imgFileName = tpl.image || tpl.imageUrl || tpl.fileName || tpl.FileName || tpl.Image || tpl.ImageUrl || tpl.PreviewUrl || tpl.previewUrl;
      return {
        ...tpl,
        width: tpl.canvasWidth || tpl.width || 1080,
        height: tpl.canvasHeight || tpl.height || 1080,
        imageUrl: imgFileName ? `${this.PREVIEW_PREFIX}/${imgFileName}` : undefined,
        jsonData: typeof tpl.jsonData === 'string'
          ? JSON.parse(tpl.jsonData)
          : (tpl.jsonData ?? [])
      };
    });
  }

  // Fetch a single template by ID (URL magic-link with templateId)
  async getTemplateById(id: number, email: string): Promise<TemplateCard> {
    const data: any = await firstValueFrom(
      this.http.get(`${this.BASE_URL}/Template/${id}`, { params: { email } })
    );
    if (!data || !data.id) throw new Error(`Template ${id} not found`);
    const imgFileName = data.image || data.imageUrl || data.fileName || data.FileName || data.Image || data.ImageUrl;
    return {
      ...data,
      width: data.canvasWidth || data.width || 1080,
      height: data.canvasHeight || data.height || 1080,
      imageUrl: imgFileName ? `${this.PREVIEW_PREFIX}/${imgFileName}` : undefined,
      jsonData: typeof data.jsonData === 'string'
        ? JSON.parse(data.jsonData)
        : (data.jsonData ?? [])
    };
  }

  // Update an existing template's JSON data (autosave)
  async updateTemplate(id: number, jsonData: string, image?: string): Promise<any> {
    return firstValueFrom(
      this.http.put(`${this.BASE_URL}/Template/UpdateTemplate`, { id, jsonData, image })
    );
  }

  /** Upload a design preview image to R2 storage — returns just the filename */
  async uploadImage(file: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', file, 'preview.png');

    const res: any = await firstValueFrom(
      this.http.post(`${this.BASE_URL}/Gemini/r2-upload`, formData)
    );
    // Return ONLY the filename for storage
    return res.fileName;
  }

  // New Method to generate template 
  async generateTemplate(payload: {
    prompt: string;
    width: number;
    height: number;
    style: string;
    templateName: string;
    email: string | null;
  }) {
    const data: any = await firstValueFrom(
      this.http.post(`${this.BASE_URL}/Gemini/text`, {
        userPrompt: payload.prompt,
        CW: payload.width,
        CH: payload.height,
        templateStyle: payload.style,
        templateName: payload.templateName,
        generateImage: true,
        email: payload.email
      })
    );

    if (!data || !data.id) {
      throw new Error('Invalid response from server');
    }

    return {
      id: data.id,
      jsonData: typeof data.jsonData === 'string'
        ? JSON.parse(data.jsonData)
        : data.jsonData
    };
  }


  async generateImage(prompt: string, w = 400, h = 400): Promise<string> {
    const body = {
      contents: [{ parts: [{ text: `${prompt} (size ${w}x${h})` }] }],
    };

    // Specify responseType: 'text' because the backend returns a raw URL string, not JSON
    const res = await firstValueFrom(
      this.http.post("https://localhost:7012/api/Gemini/image", body, {
        responseType: "text",
      }),
    );

    // Clean up quotes if present (some APIs wrap plain text in quotes)
    const url = res.replace(/^"(.*)"$/, "$1").trim();

    if (url && url.startsWith("https")) {
      return url;
    }

    // Fallback: check if it's an error object in string form
    throw new Error(
      "No valid image URL returned from API: " + url.slice(0, 100),
    );
  }

  loadPollinationsImage(prompt: string, w = 400, h = 400) {
    return this.generateImage(prompt, w, h);
  }

  async generateImgVariants(
    prompt: string,
    count = 3,
  ): Promise<(string | null)[]> {
    const promises = Array.from({ length: count }, () =>
      this.generateImage(prompt, 512, 512).catch(() => null),
    );

    return Promise.all(promises);
  }

  /** Parse raw AI JSON + apply overlap resolver using the actual canvas dimensions. */
  parseAndFixLayout(raw: string, CW: number, CH: number): any[] {
    const clean = raw.replace(/```json|```/g, "").trim();
    const m = clean.match(/\[[\s\S]*\]/);
    const layout = JSON.parse(m ? m[0] : clean);
    return resolveOverlaps(layout, CW, CH);
  }

  //   buildDesignSystemPrompt(
  //     style: string,
  //     CW: number,
  //     CH: number,
  //     generateImage: boolean = true,
  //   ): string {
  //     // Dynamic layout hints — scale the suggested zone positions to actual canvas size
  //     const ratio = CH / 800; // scale factor relative to original 800px reference
  //     const heroH = Math.round(260 * (CW / 600));
  //     const heroY = 0;
  //     const titleY = heroY + heroH + 14;
  //     const titleH = Math.round(150 * ratio);
  //     const subY = titleY + titleH + 14;
  //     const subH = Math.round(46 * ratio);
  //     const divY = subY + subH + 14;
  //     const divH = Math.round(50 * ratio);
  //     const bodyY = divY + divH + 14;
  //     const bodyH = Math.round(60 * ratio);
  //     const ctaRY = bodyY + bodyH + 14;
  //     const ctaRH = Math.round(50 * ratio);
  //     const ctaTY = ctaRY + 6;
  //     const ctaTH = Math.round(37 * ratio);

  //     const sideMargin = Math.round(CW * 0.067); // ~6.7% of width
  //     const textMinX = sideMargin;
  //     const textMaxX = CW - sideMargin;

  //     const imgType = generateImage
  //       ? `\n3. {"type":"img","x":N,"y":N,"w":N,"h":N,"aiPrompt":"highly descriptive prompt for the image","radius":N}`
  //       : `\n3. {"type":"img","x":N,"y":N,"w":N,"h":N,"radius":N}`;

  //     const imgRule = generateImage
  //       ? `\n- IMAGES & DECORATIONS: Feel free to generate MULTIPLE images via "aiPrompt" (e.g., a person on the left, an abstract decor element on the right). Place them freely!`
  //       : `\n- IMAGE PLACEHOLDERS: Feel free to include empty image upload placeholders ("type":"img") in your layout. The user will upload their own photos into these boxes manually. Place them creatively!`;

  //     const imgBorderRule = `Use the new "radius" property on BOTH "img" and "rect" elements`;

  //     return `You are an expert graphic designer AI. Output ONLY a valid JSON array of canvas elements for a ${CW}×${CH}px canvas. No markdown, no explanation, only the JSON array.

  // ELEMENT TYPES:
  // 1. {"type":"rect","x":N,"y":N,"w":N,"h":N,"bg":"#hex or linear-gradient(...)","radius":N,"locked":bool}
  // 2. {"type":"text","x":N,"y":N,"w":N,"text":"...","color":"#hex","fontSize":N,"fontWeight":N,"fontFamily":"Syne|DM Sans|Georgia|Courier","align":"left|center|right"}${imgType}

  // DESIGN RULES:
  // - Canvas: ${CW}px wide, ${CH}px tall. All elements must fit inside this.
  // - Element [0]: MUST be the background {type:"rect",x:0,y:0,w:${CW},h:${CH},locked:true,...}.
  // - TEXT HEIGHT FORMULA: fontSize × 1.4 × lineCount + 12. Ensure text fits nicely. MAX fontSize allowed is 80. Keep text sizes reasonable!
  // - CANVA-LIKE DYNAMIC COMPOSITION: Do NOT just rigidly stack elements vertically. Be highly creative! You can overlay text on top of rectangles or images. You can place items side by side.${imgRule}
  // - NO RIGID BORDERS: ${imgBorderRule} for modern, smooth aesthetics (e.g., radius: ${Math.round(24 * ratio)}). Set a massive "radius" (e.g., 999) for perfect circles!
  // - Ensure good contrast (e.g., white text on a dark background/rect).

  // Style: ${style}`;
  //   }
}
