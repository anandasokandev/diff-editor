import { Component } from '@angular/core';

import { TopbarComponent } from './components/topbar/topbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { AiModalComponent } from './components/ai-modal/ai-modal.component';
import { ImgModalComponent } from './components/img-modal/img-modal.component';
import { TemplateSetupComponent, TemplateConfig } from './components/template-setup/template-setup.component';
import { CanvasService } from './services/canvas.service';
import { ThemeService } from './services/theme.service';

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
        (created)="onTemplateCreated($event)"
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
    `,
    styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
    }
    .workspace {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
  `]
})
export class AppComponent {
  showAiModal = false;
  showImgModal = false;
  imgModalTargetId: string | null = null;

  constructor(
    public cs: CanvasService,
    public themeService: ThemeService
  ) { }

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
