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
import { specToElement } from './models/canvas.model';

@Component({
  selector: 'app-root',
  imports: [
    TopbarComponent,
    SidebarComponent,
    CanvasComponent,
    AiModalComponent,
    ImgModalComponent,
    TemplateSetupComponent
  ],
  template: `
    <!-- Template Setup (shown first) -->
    @if (cs.showSetup()) {
      <app-template-setup
        [canClose]="cs.hasExistingCanvas()"
        (created)="onTemplateCreated($event)"
        (closed)="cs.showSetup.set(false)"
        />
    }

    <!-- Main Editor Shell -->
    @if (!cs.showSetup()) {
      <div class="app-shell">
        <app-topbar
          (openAiModal)="showAiModal = true"
          (openImgModal)="openImgModalForNew()"
          (newDesign)="cs.showSetup.set(true)"
          />
        <div class="workspace">
          <app-sidebar
            (openAiModal)="showAiModal = true"
            (openImgModal)="openImgModalForNew()"
            />
          <app-canvas />
        </div>
        <app-ai-modal
          [visible]="showAiModal"
          (close)="showAiModal = false"
          />
        <app-img-modal
          [visible]="showImgModal"
          [targetId]="imgModalTargetId"
          (close)="showImgModal = false"
          />
      </div>
    }

    <!-- ── AI Permission Popup (outside shell – always reachable) ── -->
    @if (showPermissionPopup()) {
      <div class="overlay-backdrop">
        <div class="permission-card">

          <!-- Icon header -->
          <div class="perm-icon-wrap">
            <div class="perm-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
            </div>
          </div>

          <h2 class="perm-title">Generate AI Design?</h2>
          <p class="perm-sub">
            This canvas was opened with keywords. Would you like the AI to automatically
            create a design based on them?
          </p>

          <!-- Keywords preview -->
          <div class="perm-keywords">
            @for (kw of autoGenKeywordList(); track kw) {
              <span class="kw-chip">{{ kw }}</span>
            }
          </div>

          <!-- Style badge -->
          <div class="perm-style-row">
            <span class="style-label">Style</span>
            <span class="style-badge">{{ cs.urlStyle() }}</span>
          </div>

          <!-- Action buttons -->
          <div class="perm-actions">
            <button class="perm-btn perm-cancel" (click)="declineGeneration()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Skip, start blank
            </button>
            <button class="perm-btn perm-confirm" (click)="confirmGeneration()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              Yes, generate design
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Auto-generation loading overlay ── -->
    @if (autoGenLoading()) {
      <div class="overlay-backdrop">
        <div class="autogen-card">
          <div class="autogen-spinner"></div>
          <div class="autogen-title">✦ Generating your design</div>
          <div class="autogen-status">{{ autoGenStatus() }}</div>
          <div class="autogen-keywords">
            @for (kw of autoGenKeywordList(); track kw) {
              <span class="kw-chip">{{ kw }}</span>
            }
          </div>
          <div class="autogen-bar-track">
            <div class="autogen-bar" [style.width.%]="autoGenProgress()"></div>
          </div>
        </div>
      </div>
    }
    `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      position: relative;
    }
    .workspace {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    /* ── Shared overlay backdrop ── */
    .overlay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(8, 8, 16, 0.80);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn .22s ease;
    }
    @keyframes fadeIn  { from { opacity: 0 }                            to { opacity: 1 } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(22px) scale(0.97) }
                         to   { opacity: 1; transform: translateY(0)    scale(1)    } }
    @keyframes spin    { to   { transform: rotate(360deg) } }

    /* ── Permission card ── */
    .permission-card {
      background: #13131a;
      border: 1px solid #252535;
      border-radius: 22px;
      padding: 40px 44px 36px;
      width: 440px;
      max-width: 92vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      box-shadow: 0 40px 100px rgba(0,0,0,.75), 0 0 0 1px rgba(124,92,252,.08);
      animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
    }

    .perm-icon-wrap {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(124,92,252,.15), rgba(252,92,125,.1));
      border: 1.5px solid rgba(124,92,252,.25);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 4px;
    }
    .perm-icon {
      color: #9b78fc;
    }

    .perm-title {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 22px;
      color: #eeeef8;
      margin: 0;
      text-align: center;
    }
    .perm-sub {
      font-size: 13.5px;
      color: #5a5a78;
      text-align: center;
      line-height: 1.55;
      margin: 0;
      max-width: 340px;
    }

    .perm-keywords {
      display: flex; flex-wrap: wrap;
      gap: 7px; justify-content: center;
      margin: 4px 0;
    }
    .kw-chip {
      background: rgba(124,92,252,.12);
      border: 1px solid rgba(124,92,252,.25);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px; color: #a08afc;
      font-family: 'Syne', sans-serif;
      font-weight: 600;
    }

    .perm-style-row {
      display: flex; align-items: center; gap: 8px;
      background: #1a1a24; border: 1px solid #252535;
      border-radius: 8px; padding: 8px 14px;
      align-self: stretch; justify-content: space-between;
    }
    .style-label {
      font-size: 11px; color: #5a5a78;
      font-family: 'Syne', sans-serif; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
    }
    .style-badge {
      font-size: 12px; color: #eeeef8;
      font-family: 'Syne', sans-serif; font-weight: 700;
      text-transform: capitalize;
      background: rgba(124,92,252,.15);
      border: 1px solid rgba(124,92,252,.3);
      border-radius: 6px; padding: 3px 10px;
    }

    .perm-actions {
      display: flex; gap: 10px;
      align-self: stretch; margin-top: 8px;
    }
    .perm-btn {
      flex: 1; height: 44px;
      border-radius: 10px; border: none;
      font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center; gap: 7px;
      cursor: pointer; transition: all .18s;
    }
    .perm-cancel {
      background: #1a1a24;
      border: 1.5px solid #252535;
      color: #5a5a78;
      &:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,.07); }
    }
    .perm-confirm {
      background: linear-gradient(135deg, #7c5cfc, #9b6bfc);
      color: #fff;
      box-shadow: 0 4px 18px rgba(124,92,252,.35);
      &:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,92,252,.45); }
      &:active { transform: translateY(0); }
    }

    /* ── Generation progress card ── */
    .autogen-card {
      background: #13131a;
      border: 1px solid #252535;
      border-radius: 20px;
      padding: 40px 48px;
      min-width: 360px;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      box-shadow: 0 40px 100px rgba(0,0,0,.7);
      animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
    }
    .autogen-spinner {
      width: 44px; height: 44px;
      border: 3px solid rgba(124,92,252,.2);
      border-top-color: #7c5cfc;
      border-radius: 50%;
      animation: spin .75s linear infinite;
    }
    .autogen-title {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 18px;
      background: linear-gradient(135deg, #7c5cfc, #fc5c7d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .autogen-status {
      font-size: 13px; color: #5a5a78;
      text-align: center; min-height: 20px;
    }
    .autogen-keywords {
      display: flex; flex-wrap: wrap;
      gap: 6px; justify-content: center;
    }
    .autogen-bar-track {
      width: 100%; height: 4px;
      background: #1e1e2c; border-radius: 2px; overflow: hidden;
    }
    .autogen-bar {
      height: 100%;
      background: linear-gradient(90deg, #7c5cfc, #fc5c7d);
      border-radius: 2px; transition: width .4s ease;
    }
  `]
})
export class AppComponent implements OnInit {
  showAiModal = false;
  showImgModal = false;
  imgModalTargetId: string | null = null;

  showPermissionPopup = signal(false);
  autoGenLoading = signal(false);
  autoGenProgress = signal(0);
  autoGenStatus = signal('');
  autoGenKeywordList = signal<string[]>([]);

  constructor(
    public cs: CanvasService,
    public themeService: ThemeService,
    private ai: AiService
  ) { }

  ngOnInit() {
    if (this.cs.shouldAutoGenerate) {
      this.cs.shouldAutoGenerate = false;
      const keywords = this.cs.urlKeywords();
      this.autoGenKeywordList.set(
        keywords.split(',').map(k => k.trim()).filter(Boolean)
      );
      // Show permission popup — do NOT generate yet
      this.showPermissionPopup.set(true);
    }
  }

  /** User clicked "Yes, generate design" */
  confirmGeneration() {
    this.showPermissionPopup.set(false);
    this.runAutoGenerate(this.cs.urlKeywords(), this.cs.urlStyle());
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

  private async runAutoGenerate(keywords: string, style: string) {
    const CW = this.cs.canvasWidth();
    const CH = this.cs.canvasHeight();

    this.autoGenLoading.set(true);
    this.setGenProgress(10, `Designing layout for ${CW}×${CH}px…`);

    try {
      const sys = this.ai.buildDesignSystemPrompt(style, CW, CH);
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
