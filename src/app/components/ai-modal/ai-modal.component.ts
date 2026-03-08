import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../services/canvas.service';
import { AiService } from '../../services/ai.service';
import { specToElement } from '../../models/canvas.model';

interface GenState { loading: boolean; progress: number; status: string; }

@Component({
  selector: 'app-ai-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" *ngIf="visible" (click)="onOverlayClick($event)">
      <div class="modal">

        <div class="modal-head">
          <div>
            <div class="modal-title">✦ AI Template Generator</div>
            <div class="modal-sub">Generating for <strong>{{ cs.canvasWidth() }}×{{ cs.canvasHeight() }}px</strong> canvas · AI builds layout + images</div>
          </div>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <div class="modal-body">
          <div class="ai-badge">✦ Powered by Gemini + Pollinations AI</div>

          <div class="sec-label">Describe Your Design</div>
          <textarea
            class="prompt-area"
            [(ngModel)]="aiPrompt"
            placeholder="e.g. A bold coffee shop launch post with dark moody vibes, strong typography, and a CTA button…"
          ></textarea>

          <div class="sec-label">Quick Prompts</div>
          <div class="chips">
            <div *ngFor="let c of quickPrompts" class="chip"
              [class.active]="aiPrompt === c.value"
              (click)="aiPrompt = c.value">
              {{ c.label }}
            </div>
          </div>

          <div class="sec-label">Visual Style</div>
          <div class="style-grid">
            <div *ngFor="let s of styles" class="style-card"
              [class.active]="aiStyle === s.value"
              (click)="aiStyle = s.value">
              <div class="sc-icon">{{ s.icon }}</div>
              <div class="sc-name">{{ s.label }}</div>
              <div class="sc-sub">{{ s.sub }}</div>
            </div>
          </div>

          <!-- Progress -->
          <div *ngIf="state.loading" class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="state.progress"></div>
            </div>
            <div class="status-text">{{ state.status }}</div>
          </div>
          <div *ngIf="!state.loading && state.status" class="error-text">{{ state.status }}</div>

          <button class="gen-btn" [disabled]="state.loading" (click)="generate()">
            <span class="shimmer"></span>
            {{ state.loading ? 'Generating…' : '✦ Generate Design' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      width: 560px; max-width: 94vw; max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 40px 100px rgba(0,0,0,.6);
      animation: fadeIn .25s ease;
    }
    .modal-head {
      padding: 22px 24px 16px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: flex-start; justify-content: space-between;
    }
    .modal-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; }
    .modal-sub   { font-size: 12px; color: var(--muted); margin-top: 3px; }
    .close-btn {
      width: 30px; height: 30px; border-radius: 7px;
      border: 1px solid var(--border); background: transparent;
      color: var(--text); font-size: 16px;
      &:hover { background: var(--panel); }
    }
    .modal-body { padding: 20px 24px; }
    .ai-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: linear-gradient(135deg,rgba(124,92,252,.15),rgba(252,92,125,.1));
      border: 1px solid rgba(124,92,252,.35);
      border-radius: 20px; padding: 3px 10px;
      font-size: 10.5px; font-family: 'Syne', sans-serif; font-weight: 700; color: var(--accent);
      margin-bottom: 14px;
    }
    .sec-label {
      font-size: 11px; font-family: 'Syne', sans-serif; font-weight: 700;
      color: var(--muted); letter-spacing: .06em; text-transform: uppercase;
      margin: 12px 0 7px;
      &:first-of-type { margin-top: 0; }
    }
    .prompt-area {
      width: 100%; min-height: 88px;
      background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
      color: var(--text); font-size: 14px; padding: 12px 14px;
      resize: vertical; line-height: 1.5;
      &::placeholder { color: var(--muted); }
    }
    .chips {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
    }
    .chip {
      padding: 5px 11px; border-radius: 20px;
      border: 1px solid var(--border); background: var(--panel);
      font-size: 11.5px; cursor: pointer; color: var(--muted);
      transition: all .15s;
      &:hover { border-color: var(--accent); color: var(--text); }
      &.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    }
    .style-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;
    }
    .style-card {
      padding: 10px 7px; border-radius: 9px;
      border: 1.5px solid var(--border); cursor: pointer; text-align: center;
      background: var(--panel); transition: all .18s;
      &:hover { border-color: var(--accent); }
      &.active { border-color: var(--accent); background: rgba(124,92,252,.12); }
    }
    .sc-icon { font-size: 22px; margin-bottom: 3px; }
    .sc-name { font-size: 10px; font-family: 'Syne', sans-serif; font-weight: 700; }
    .sc-sub  { font-size: 9px; color: var(--muted); margin-top: 2px; }
    .progress-wrap { margin: 10px 0 6px; }
    .progress-bar  { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 2px; transition: width .4s; }
    .status-text   { font-size: 11px; color: var(--muted); text-align: center; }
    .error-text    { font-size: 11px; color: var(--accent2); text-align: center; margin-bottom: 6px; }
    .gen-btn {
      width: 100%; height: 46px; border-radius: 11px; border: none;
      background: linear-gradient(135deg, var(--accent), #9b6bfc, var(--accent2));
      color: #fff; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
      letter-spacing: .02em; position: relative; overflow: hidden; margin-top: 6px;
      &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(124,92,252,.4); }
      &:disabled { opacity: .6; cursor: wait; }
    }
    .shimmer {
      position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
      transform: translateX(-100%);
    }
    .gen-btn:disabled .shimmer { animation: shimmer 1.2s infinite; }
  `]
})
export class AiModalComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  aiPrompt = '';
  aiStyle = 'bold';
  state: GenState = { loading: false, progress: 0, status: '' };

  quickPrompts = [
    { label: '🚀 Tech Launch', value: 'A modern tech startup launch announcement' },
    { label: '👗 Fashion', value: 'A luxury fashion brand Instagram post' },
    { label: '🎵 Event', value: 'A vibrant music festival event flyer' },
    { label: '🧘 Wellness', value: 'A minimal wellness and meditation poster' },
    { label: '🍔 Food', value: 'A bold restaurant food promotional post' },
    { label: '🎮 Gaming', value: 'A dark cyberpunk gaming tournament poster' },
  ];

  styles = [
    { value: 'bold', icon: '⚡', label: 'BOLD', sub: 'High impact' },
    { value: 'minimal', icon: '◻', label: 'MINIMAL', sub: 'Clean & airy' },
    { value: 'elegant', icon: '✦', label: 'ELEGANT', sub: 'Refined luxury' },
    { value: 'playful', icon: '🎨', label: 'PLAYFUL', sub: 'Fun & colorful' },
    { value: 'dark', icon: '🌑', label: 'DARK', sub: 'Moody dramatic' },
    { value: 'retro', icon: '📼', label: 'RETRO', sub: 'Vintage vibes' },
  ];

  constructor(public cs: CanvasService, private ai: AiService) { }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.close.emit();
  }

  setProgress(pct: number, msg: string) {
    this.state = { loading: true, progress: pct, status: msg };
  }

  async generate() {
    if (!this.aiPrompt.trim()) return;
    const CW = this.cs.canvasWidth();
    const CH = this.cs.canvasHeight();

    this.setProgress(10, `Designing layout for ${CW}×${CH}px canvas…`);

    const sys = this.ai.buildDesignSystemPrompt(this.aiStyle, CW, CH);

    try {
      const raw = await this.ai.callClaude(sys, `Create a ${this.aiStyle} design for: ${this.aiPrompt}`);
      this.setProgress(45, 'Parsing layout…');

      let layout: any[];
      try {
        layout = this.ai.parseAndFixLayout(raw, CW, CH);
      } catch {
        throw new Error('Could not parse AI layout. Please try again.');
      }

      this.setProgress(60, 'Building canvas…');

      const imgSpecs: { id: string; prompt: string; w: number; h: number }[] = [];
      const newEls = layout.map((s: any) => {
        const el = specToElement(s);
        if (!el) return null;
        if (s.type === 'img' && s.aiPrompt) {
          imgSpecs.push({ id: el.id, prompt: s.aiPrompt, w: s.w || 400, h: s.h || 300 });
        }
        return el;
      }).filter(Boolean);

      // ── Apply the AI background colour to the canvas bg signal
      //    so the canvas is truly filled even if the bg rect has opacity or is missing
      const bgSpec = layout.find((s: any) =>
        s.type === 'rect' && s.locked && s.x <= 10 && s.y <= 10 &&
        s.w >= CW - 20 && s.h >= CH - 20
      );
      if (bgSpec?.bg) {
        this.cs.setCanvasBg(bgSpec.bg);
      }

      this.cs.elements.set(newEls as any);
      this.cs.selectedId.set(null);

      // Generate images
      for (let i = 0; i < imgSpecs.length; i++) {
        const sp = imgSpecs[i];
        this.setProgress(65 + i * 15, `Generating image ${i + 1} of ${imgSpecs.length}…`);
        try {
          const src = await this.ai.generateImage(sp.prompt, sp.w, sp.h);
          this.cs.setImageSrc(sp.id, src);
        } catch (err) {
          console.warn('Image gen failed', err);
        }
      }

      this.state = { loading: true, progress: 100, status: '✦ Design complete!' };
      setTimeout(() => {
        this.close.emit();
        this.state = { loading: false, progress: 0, status: '' };
      }, 800);

    } catch (err: any) {
      this.state = { loading: false, progress: 0, status: '⚠ ' + err.message.slice(0, 80) };
    }
  }
}
