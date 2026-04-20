import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { CanvasService } from './services/canvas.service';
import { AiService } from './services/ai.service';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './components/login/login.component';
import { specToElement } from './models/canvas.model';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    LoginComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  showPermissionPopup = signal(false);
  autoGenLoading = signal(false);
  isCheckingUrlAuth = signal(false);
  autoGenProgress = signal(0);
  autoGenStatus = signal('');
  autoGenKeywordList = signal<string[]>([]);
  urlAuthStatus = signal('Authenticating...');

  constructor(
    public cs: CanvasService,
    public themeService: ThemeService,
    private ai: AiService,
    public auth: AuthService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.checkAuthFromUrl();

    // Only proceed with auto-generation if authenticated AND coming via keywords URL
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
    const templateId = this.cs.urlTemplateId();
    const hasKeywords = !!this.cs.urlKeywords();

    if (email && token && ts) {
      // ── URL-based login (magic link) ──
      this.urlAuthStatus.set('Authenticating...');
      this.isCheckingUrlAuth.set(true);
      try {
        const res = await this.auth.validate(email, token, ts);
        if (!res || !res.token) {
          this.auth.logout();
          return;
        }

        // Decide what to do after successful URL auth
        if (templateId) {
          this.router.navigate(['/canvas', templateId]);
        } else if (hasKeywords) {
          this.router.navigate(['/canvas']);
          // Popup logic is in ngOnInit
        } else {
          this.router.navigate(['/dashboard']);
        }

      } catch (err) {
        console.error('URL Validation failed', err);
        this.auth.logout();
      } finally {
        this.isCheckingUrlAuth.set(false);
      }
    } else if (this.auth.isAuthenticated()) {
        // Already logged in - maybe redirect to dashboard if at root
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
            this.router.navigate(['/dashboard']);
        }
    }
  }

  onLoginSuccess() {
    const hasKeywords = !!this.cs.urlKeywords();
    const hasTemplateId = !!this.cs.urlTemplateId();

    if (hasTemplateId) {
      this.router.navigate(['/canvas', this.cs.urlTemplateId()]);
    } else if (hasKeywords) {
      this.router.navigate(['/canvas']);
      // Re-check auto-gen logic
      this.showPermissionPopup.set(true);
    } else {
      this.router.navigate(['/dashboard']);
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
      this.setGenProgress(25, 'Asking AI to design your template…');

      const res: any = await this.ai.generateTemplate({
        prompt: `Create a ${style} design for: ${keywords}`,
        width: CW,
        height: CH,
        style: style,
        templateName: 'Auto Generated Design',
        email: this.auth.email()
      });

      this.cs.templateId.set(res.id);
      this.setGenProgress(50, 'Parsing layout…');

      let layout: any[];
      try {
        layout = res.jsonData; 
      } catch {
        throw new Error('Invalid layout from server');
      }

      this.setGenProgress(65, 'Building canvas elements…');
      const imgSpecs: { id: string; prompt: string; w: number; h: number }[] = [];

      const newEls = layout.map((s: any) => {
        const el = specToElement(s);
        if (!el) return null;
        if (s.type === 'img' && s.aiPrompt && !s.src && generateImage) {
          imgSpecs.push({ id: el.id, prompt: s.aiPrompt, w: s.w || 400, h: s.h || 300 });
        }
        return el;
      }).filter(Boolean);

      const bgSpec = layout.find((s: any) =>
        s.type === 'rect' && s.locked &&
        s.x <= 10 && s.y <= 10 &&
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

  onTemplateCreated(cfg: { name: string; width: number; height: number }) {
    this.cs.initTemplate(cfg.name, cfg.width, cfg.height);
  }
}
