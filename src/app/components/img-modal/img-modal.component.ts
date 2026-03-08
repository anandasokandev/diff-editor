import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../services/canvas.service';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-img-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" *ngIf="visible" (click)="onOverlayClick($event)">
      <div class="modal">

        <div class="modal-head">
          <div>
            <div class="modal-title">🤖 AI Image Generator</div>
            <div class="modal-sub">Generate images from prompts via Gemini AI</div>
          </div>
          <button class="close-btn" (click)="doClose()">✕</button>
        </div>

        <div class="modal-body">
          <div class="gen-box">
            <div class="input-row">
              <input class="img-input" [(ngModel)]="imgPrompt"
                placeholder="Describe the image you want…"
                (keydown.enter)="generate()" />
              <button class="gen-small-btn" [disabled]="loading" (click)="generate()">
                {{ loading ? '…' : 'Generate' }}
              </button>
            </div>

            <div class="chips">
              <div *ngFor="let c of quickPrompts" class="chip"
                [class.active]="imgPrompt === c.value"
                (click)="imgPrompt = c.value">{{ c.label }}</div>
            </div>

            <!-- Loading placeholders -->
            <div *ngIf="loading" class="img-grid">
              <div *ngFor="let _ of [0,1,2]" class="img-loading">
                <div class="spinner"></div>
                <span>Generating…</span>
              </div>
            </div>

            <!-- Results -->
            <div *ngIf="!loading && results.length" class="img-grid">
              <div *ngFor="let url of results; let i = index"
                class="img-preview"
                [class.selected]="selectedUrl === url"
                (click)="url && (selectedUrl = url)">
                <img *ngIf="url" [src]="url" />
                <div *ngIf="!url" class="img-fail">⚠</div>
                <div *ngIf="url && selectedUrl === url" class="check">✓</div>
              </div>
            </div>

            <div *ngIf="selectedUrl" class="sel-info">Image selected ✓ — click Insert below</div>
          </div>

          <button class="insert-btn" [disabled]="!selectedUrl" (click)="insert()">
            Insert Selected Image to Canvas
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.8); backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; width: 560px; max-width: 94vw; max-height: 90vh;
      overflow-y: auto; box-shadow: 0 40px 100px rgba(0,0,0,.6);
      animation: fadeIn .25s ease;
    }
    .modal-head {
      padding: 22px 24px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: flex-start; justify-content: space-between;
    }
    .modal-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; }
    .modal-sub   { font-size: 12px; color: var(--muted); margin-top: 3px; }
    .close-btn {
      width: 30px; height: 30px; border-radius: 7px;
      border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 16px;
      &:hover { background: var(--panel); }
    }
    .modal-body { padding: 20px 24px; }
    .gen-box {
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px;
    }
    .input-row { display: flex; gap: 8px; margin-bottom: 10px; }
    .img-input {
      flex: 1; height: 34px; background: var(--bg);
      border: 1px solid var(--border); border-radius: 8px;
      color: var(--text); font-size: 12.5px; padding: 0 12px;
    }
    .gen-small-btn {
      height: 34px; padding: 0 14px; border-radius: 8px; border: none;
      background: var(--accent); color: #fff;
      font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px;
      &:disabled { opacity: .6; }
      &:not(:disabled):hover { background: #6a48e8; }
    }
    .chips {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;
    }
    .chip {
      padding: 4px 10px; border-radius: 20px;
      border: 1px solid var(--border); background: var(--bg);
      font-size: 11px; cursor: pointer; color: var(--muted); transition: all .15s;
      &:hover { border-color: var(--accent); color: var(--text); }
      &.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    }
    .img-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 6px;
    }
    .img-loading {
      aspect-ratio: 1; border-radius: 8px;
      background: var(--panel); border: 1px solid var(--border);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; color: var(--muted); font-size: 11px;
    }
    .spinner {
      width: 22px; height: 22px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    .img-preview {
      aspect-ratio: 1; border-radius: 8px; overflow: hidden;
      cursor: pointer; border: 2px solid transparent; position: relative;
      transition: all .18s;
      &:hover { border-color: var(--accent); transform: scale(1.03); }
      &.selected { border-color: var(--accent3); box-shadow: 0 0 0 3px rgba(0,212,170,.2); }
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }
    .img-fail {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      background: var(--panel); border: 1px solid rgba(252,92,125,.3); font-size: 20px;
    }
    .check {
      position: absolute; top: 5px; right: 5px;
      width: 20px; height: 20px; background: var(--accent3);
      border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px;
    }
    .sel-info { text-align: center; font-size: 11px; color: var(--muted); margin-top: 8px; }
    .insert-btn {
      width: 100%; height: 46px; border-radius: 11px; border: none; margin-top: 12px;
      background: linear-gradient(135deg, var(--accent), #9b6bfc, var(--accent2));
      color: #fff; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
      &:disabled { opacity: .5; cursor: not-allowed; }
      &:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(124,92,252,.4); }
    }
  `]
})
export class ImgModalComponent {
  @Input() visible = false;
  @Input() targetId: string | null = null;
  @Output() close = new EventEmitter<void>();

  imgPrompt = '';
  loading = false;
  results: (string | null)[] = [];
  selectedUrl: string | null = null;

  quickPrompts = [
    { label: '☕ Coffee',   value: 'Steaming artisan coffee cup, dark wood, moody lighting, photorealistic' },
    { label: '🎨 Abstract', value: 'Vibrant geometric abstract pattern, purple gold, digital art' },
    { label: '🌆 City',     value: 'City skyline golden hour, cinematic, high detail' },
    { label: '🌿 Nature',   value: 'Tropical leaves flat lay, vivid green, overhead shot' },
    { label: '💻 Product',  value: 'Sleek tech product minimal white background, studio lighting' },
  ];

  constructor(private cs: CanvasService, private ai: AiService) {}

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.doClose();
  }

  doClose() {
    this.close.emit();
    this.results = [];
    this.selectedUrl = null;
  }

  async generate() {
    if (!this.imgPrompt.trim()) return;
    this.loading = true;
    this.results = [];
    this.selectedUrl = null;

    try {
      this.results = await this.ai.generateImgVariants(this.imgPrompt);
    } finally {
      this.loading = false;
    }
  }

  insert() {
    if (!this.selectedUrl) return;
    if (this.targetId) {
      this.cs.setImageSrc(this.targetId, this.selectedUrl);
    } else {
      this.cs.addElement({ type:'img', x:80, y:80, w:300, h:300, src: this.selectedUrl });
    }
    this.doClose();
  }
}
