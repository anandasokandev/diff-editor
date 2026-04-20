import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { AiModalComponent } from '../ai-modal/ai-modal.component';
import { ImgModalComponent } from '../img-modal/img-modal.component';
import { TemplateSetupComponent, TemplateConfig } from '../template-setup/template-setup.component';
import { CanvasService } from '../../services/canvas.service';
import { AiService } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { specToElement } from '../../models/canvas.model';

@Component({
  selector: 'app-editor-shell',
  standalone: true,
  imports: [
    CommonModule,
    TopbarComponent,
    SidebarComponent,
    CanvasComponent,
    AiModalComponent,
    ImgModalComponent,
    TemplateSetupComponent
  ],
  templateUrl: './editor-shell.component.html',
  styleUrl: './editor-shell.component.scss'
})
export class EditorShellComponent implements OnInit {
  showAiModal = false;
  showImgModal = false;
  imgModalTargetId: string | null = null;

  loadingTemplate = signal(false);
  error = signal<string | null>(null);

  constructor(
    public cs: CanvasService,
    private ai: AiService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    // Read :id param
    this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
            this.loadTemplate(Number(id));
        } else {
            // New canvas flow - check if we should show setup
            if (!this.cs.hasExistingCanvas()) {
                this.cs.showSetup.set(true);
            }
        }
    });

    // Check if we came here via a redirect that had keywords
    // (Handled by AppComponent and then navigating here)
  }

  private async loadTemplate(id: number) {
    const email = this.auth.email();
    if (!email) {
        this.error.set('You must be logged in to view this design.');
        return;
    }

    this.loadingTemplate.set(true);
    this.error.set(null);
    try {
      const tpl = await this.ai.getTemplateById(id, email);
      this.cs.loadTemplateData(tpl);
    } catch (err: any) {
      console.error('EditorShell: Failed to load template', err);
      this.error.set(err.message || 'Could not load your design.');
    } finally {
      this.loadingTemplate.set(false);
    }
  }

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
  
  goHome() {
    this.router.navigate(['/dashboard']);
  }
}
