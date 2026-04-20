import { Component, Input, Output, EventEmitter, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../services/canvas.service';
import { AiService } from '../../services/ai.service';
import { specToElement } from '../../models/canvas.model';
import { AuthService } from 'src/app/services/auth.service';

interface GenState { loading: boolean; progress: number; status: string; }

@Component({
  selector: 'app-ai-modal',
  imports: [FormsModule],
  templateUrl: './ai-modal.component.html',
  styleUrl: './ai-modal.component.scss',
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

  constructor(
    public cs: CanvasService,
    private ai: AiService,
    private auth: AuthService
  ) { }

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

    try {
      this.setProgress(30, 'Generating design…');

      const res: any = await this.ai.generateTemplate({
        prompt: this.aiPrompt,
        width: CW,
        height: CH,
        style: this.aiStyle,
        templateName: 'My Design',
        email: this.auth.email()
      });

      // 🔥 STORE TEMPLATE ID (IMPORTANT FOR AUTOSAVE)
      this.cs.templateId.set(res.id);

      this.setProgress(45, 'Parsing layout…');

      let layout: any[];
      try {
        layout = res.jsonData;
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

      this.cs.setElements(newEls as any);

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
