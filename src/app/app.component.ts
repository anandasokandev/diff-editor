import { Component, OnInit, signal } from '@angular/core';

import { TopbarComponent } from './components/topbar/topbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { AiModalComponent } from './components/ai-modal/ai-modal.component';
import { ImgModalComponent } from './components/img-modal/img-modal.component';
import { TemplateSetupComponent, TemplateConfig } from './components/template-setup/template-setup.component';
import { CanvasService } from './services/canvas.service';
import { AiService } from './services/ai.service';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './components/login/login.component';
import { specToElement } from './models/canvas.model';

@Component({
  selector: 'app-root',
  imports: [
    TopbarComponent,
    SidebarComponent,
    CanvasComponent,
    AiModalComponent,
    ImgModalComponent,
    TemplateSetupComponent,
    LoginComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  showAiModal = false;
  showImgModal = false;
  imgModalTargetId: string | null = null;

  showPermissionPopup = signal(false);
  autoGenLoading = signal(false);
  isCheckingUrlAuth = signal(false);
  autoGenProgress = signal(0);
  autoGenStatus = signal('');
  autoGenKeywordList = signal<string[]>([]);

  constructor(
    public cs: CanvasService,
    public themeService: ThemeService,
    private ai: AiService,
    public auth: AuthService
  ) { }

  async ngOnInit() {
    await this.checkAuthFromUrl();

    // Only proceed with auto-generation if authenticated
    if (this.auth.isAuthenticated() && this.cs.shouldAutoGenerate) {
      this.cs.shouldAutoGenerate = false;
      const keywords = this.cs.urlKeywords();
      this.autoGenKeywordList.set(
        keywords.split(',').map(k => k.trim()).filter(Boolean)
      );
      // Show permission popup — do NOT generate yet
      this.showPermissionPopup.set(true);
    }
  }

  async checkAuthFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const token = params.get('token');
    const ts = params.get('ts');

    if (email && token && ts) {
      this.isCheckingUrlAuth.set(true);
      try {
        const res = await this.auth.validate(email, token, ts);
        if (!res || !res.token) {
          this.auth.logout();
        }
      } catch (err) {
        console.error('URL Validation failed', err);
        this.auth.logout();
      } finally {
        this.isCheckingUrlAuth.set(false);
      }
    }
  }

  onLoginSuccess() {
    // Re-check auto-gen logic if needed after login
    if (this.cs.shouldAutoGenerate) {
      const keywords = this.cs.urlKeywords();
      this.autoGenKeywordList.set(
        keywords.split(',').map(k => k.trim()).filter(Boolean)
      );
      this.showPermissionPopup.set(true);
    }
  }

  /** User clicked "Yes, generate design" */
  confirmGeneration() {
    this.showPermissionPopup.set(false);
    this.runAutoGenerate(this.cs.urlKeywords(), this.cs.urlStyle(), this.cs.urlGenerateImage());
  }

  /** User clicked "Skip, start blank" */
  declineGeneration() {
    this.showPermissionPopup.set(false);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private setGenProgress(pct: number, msg: string) {
    this.autoGenProgress.set(pct);
    this.autoGenStatus.set(msg);
  }

  private async runAutoGenerate(keywords: string, style: string, generateImage: boolean) {
    const CW = this.cs.canvasWidth();
    const CH = this.cs.canvasHeight();

    this.autoGenLoading.set(true);
    this.setGenProgress(10, `Designing layout for ${CW}×${CH}px…`);

    try {
      const sys = this.ai.buildDesignSystemPrompt(style, CW, CH, generateImage);
      const prompt = `Create a ${style} design for the following keywords: ${keywords}`;

      this.setGenProgress(20, 'Asking AI to design your template…');
      const raw = await this.ai.callClaude(sys, prompt);

      this.setGenProgress(50, 'Parsing layout…');
      let layout: any[];
      try {
        layout = this.ai.parseAndFixLayout(raw, CW, CH);
      } catch {
        throw new Error('Could not parse AI layout. Please try again.');
      }

      this.setGenProgress(65, 'Building canvas elements…');

      const imgSpecs: { id: string; prompt: string; w: number; h: number }[] = [];
      const newEls = layout.map((s: any) => {
        const el = specToElement(s);
        if (!el) return null;
        if (s.type === 'img' && s.aiPrompt) {
          imgSpecs.push({ id: el.id, prompt: s.aiPrompt, w: s.w || 400, h: s.h || 300 });
        }
        return el;
      }).filter(Boolean);

      const bgSpec = layout.find((s: any) =>
        s.type === 'rect' && s.locked && s.x <= 10 && s.y <= 10 &&
        s.w >= CW - 20 && s.h >= CH - 20
      );
      if (bgSpec?.bg) this.cs.setCanvasBg(bgSpec.bg);
      this.cs.setElements(newEls as any);

      if (generateImage) {
        for (let i = 0; i < imgSpecs.length; i++) {
          const sp = imgSpecs[i];
          this.setGenProgress(70 + i * 10, `Generating image ${i + 1} of ${imgSpecs.length}…`);
          try {
            const src = await this.ai.generateImage(sp.prompt, sp.w, sp.h);
            this.cs.setImageSrc(sp.id, src);
          } catch (err) {
            console.warn('Image gen failed', err);
          }
        }
      }

      this.setGenProgress(100, '✦ Design ready!');
      setTimeout(() => {
        this.autoGenLoading.set(false);
        this.autoGenProgress.set(0);
        this.autoGenStatus.set('');
      }, 900);

    } catch (err: any) {
      this.autoGenStatus.set('⚠ ' + (err.message ?? 'Generation failed').slice(0, 100));
      setTimeout(() => { this.autoGenLoading.set(false); }, 3000);
    }
  }

  // ── Public handlers ────────────────────────────────────────────────────────

  onTemplateCreated(cfg: TemplateConfig) {
    this.cs.initTemplate(cfg.name, cfg.width, cfg.height);
  }

  openImgModalForNew() {
    this.imgModalTargetId = null;
    this.showImgModal = true;
  }

  openImgModalForEl(id: string) {
    this.imgModalTargetId = id;
    this.showImgModal = true;
  }
}
