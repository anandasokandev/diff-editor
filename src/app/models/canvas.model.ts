export type ElementType = 'rect' | 'text' | 'img';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  locked: boolean;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  h: number;
  bg: string;
  radius: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  color: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  align: 'left' | 'center' | 'right';
}

export interface ImgElement extends BaseElement {
  type: 'img';
  h: number;
  src: string | null;
  radius?: number;
}

export type CanvasElement = RectElement | TextElement | ImgElement;

export interface DragState {
  id: string;
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
}

export interface ResizeState {
  id: string;
  dir: string;
  startX: number;
  startY: number;
  origW: number;
  origH: number;
  origLeft: number;
  origTop: number;
}

export interface GenState {
  loading: boolean;
  progress: number;
  status: string;
}

export interface PresetTemplate {
  name: string;
  bg: string;
  els: Partial<CanvasElement & { aiPrompt?: string }>[];
}

export const FONT_MAP: Record<string, string> = {
  'Syne': "'Syne', sans-serif",
  'DM Sans': "'DM Sans', sans-serif",
  'Georgia': 'Georgia, serif',
  'Courier': "'Courier New', monospace"
};

export function getFontFamily(f: string): string {
  return FONT_MAP[f] || f || "'Syne', sans-serif";
}

let _idCounter = 0;
export function uid(): string {
  return `el-${++_idCounter}`;
}

export function specToElement(s: any): CanvasElement | null {
  const base = { id: uid(), locked: s.locked || false };
  if (s.type === 'rect') {
    return { ...base, type: 'rect', x: s.x || 0, y: s.y || 0, w: s.w || 100, h: s.h || 100, bg: s.bg || '#7c5cfc', radius: s.radius || 0 } as RectElement;
  }
  if (s.type === 'text') {
    return { ...base, type: 'text', x: s.x || 0, y: s.y || 0, w: s.w || 240, text: s.text || 'Text', color: s.color || '#222', fontSize: s.fontSize || 24, fontWeight: s.fontWeight || 700, fontFamily: s.fontFamily || 'Syne', align: s.align || 'left' } as TextElement;
  }
  if (s.type === 'img') {
    return { ...base, type: 'img', x: s.x || 0, y: s.y || 0, w: s.w || 300, h: s.h || 200, src: s.src || null, radius: s.radius || 0 } as ImgElement;
  }
  return null;
}

export const PRESETS: PresetTemplate[] = [
  {
    name: 'Social Post', bg: 'linear-gradient(135deg,#667eea,#764ba2)',
    els: [
      { type:'rect', x:0, y:0, w:600, h:800, bg:'linear-gradient(135deg,#667eea,#764ba2)', locked:true },
      { type:'text', x:60, y:190, w:480, text:'Your Brand\nHere', color:'#fff', fontSize:64, fontWeight:800, fontFamily:'Syne', align:'left' },
      { type:'text', x:60, y:370, w:480, text:'Inspiring subtitle goes here', color:'rgba(255,255,255,.75)', fontSize:20, fontWeight:400, fontFamily:'DM Sans', align:'left' },
      { type:'rect', x:60, y:450, w:160, h:48, bg:'#fff', radius:24 },
      { type:'text', x:60, y:463, w:160, text:'Learn More', color:'#764ba2', fontSize:15, fontWeight:700, fontFamily:'Syne', align:'center' },
    ]
  },
  {
    name: 'Minimal', bg: '#fff8f0',
    els: [
      { type:'rect', x:0, y:0, w:600, h:800, bg:'#fff8f0', locked:true },
      { type:'rect', x:0, y:0, w:600, h:7, bg:'#222' },
      { type:'text', x:50, y:70, w:500, text:'MINIMAL', color:'#222', fontSize:72, fontWeight:800, fontFamily:'Syne', align:'left' },
      { type:'text', x:50, y:190, w:500, text:'DESIGN', color:'#222', fontSize:72, fontWeight:800, fontFamily:'Syne', align:'left' },
      { type:'rect', x:50, y:310, w:500, h:2, bg:'#222' },
      { type:'text', x:50, y:326, w:500, text:'Clean. Simple. Powerful.', color:'#888', fontSize:17, fontFamily:'DM Sans', align:'left' },
      { type:'img', x:50, y:390, w:500, h:340, src:null },
    ]
  },
  {
    name: 'Dark Card', bg: '#0e0e12',
    els: [
      { type:'rect', x:0, y:0, w:600, h:800, bg:'#0e0e12', locked:true },
      { type:'rect', x:28, y:28, w:544, h:744, bg:'#16161d', radius:20 },
      { type:'img', x:60, y:60, w:480, h:110, src:null },
      { type:'rect', x:60, y:280, w:180, h:4, bg:'linear-gradient(90deg,#7c5cfc,#fc5c7d)' },
      { type:'text', x:60, y:170, w:480, text:'Premium\nExperience', color:'#fff', fontSize:50, fontWeight:800, fontFamily:'Syne', align:'left' },
      { type:'text', x:60, y:308, w:480, text:'Crafted with attention to every detail.', color:'#8888a0', fontSize:15, fontFamily:'DM Sans', align:'left' },
    ]
  },
  {
    name: 'Event Flyer', bg: 'linear-gradient(135deg,#f093fb,#f5576c)',
    els: [
      { type:'rect', x:0, y:0, w:600, h:800, bg:'#fff', locked:true },
      { type:'rect', x:0, y:0, w:600, h:290, bg:'linear-gradient(135deg,#f093fb,#f5576c)' },
      { type:'text', x:40, y:70, w:520, text:'SUMMER\nFEST 2025', color:'#fff', fontSize:60, fontWeight:800, fontFamily:'Syne', align:'left' },
      { type:'text', x:40, y:320, w:520, text:'📅 July 15–17, 2025', color:'#333', fontSize:17, fontWeight:600, fontFamily:'DM Sans', align:'left' },
      { type:'text', x:40, y:362, w:520, text:'📍 Beachfront Arena', color:'#555', fontSize:15, fontFamily:'DM Sans', align:'left' },
      { type:'rect', x:40, y:430, w:150, h:46, bg:'linear-gradient(135deg,#f093fb,#f5576c)', radius:8 },
      { type:'text', x:40, y:443, w:150, text:'Get Tickets', color:'#fff', fontSize:14, fontWeight:700, fontFamily:'Syne', align:'center' },
    ]
  }
];
