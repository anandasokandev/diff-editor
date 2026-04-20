
import { Component, EventEmitter, Output } from '@angular/core';
import { CanvasService } from '../../services/canvas.service';
import { DownloadService } from '../../services/download.service';
import { ThemeService } from '../../services/theme.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  @Output() openAiModal = new EventEmitter<void>();
  @Output() openImgModal = new EventEmitter<void>();
  @Output() newDesign = new EventEmitter<void>();
  @Output() openDashboard = new EventEmitter<void>();

  downloading = false;

  constructor(
    public cs: CanvasService,
    public themeService: ThemeService,
    private dlSvc: DownloadService
  ) { }

  get zoomPct() { return Math.round(this.cs.zoom() * 100); }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.cs.addElement({ type: 'img', x: 80, y: 80, w: 300, h: 200, src: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    (e.target as HTMLInputElement).value = '';
  }

  resetCanvas() {
    if (!confirm('Reset canvas? All elements will be removed and this cannot be undone.')) return;
    this.cs.clearCanvas();
    this.cs.clearCanvasState();
  }

  async download() {
    this.downloading = true;
    try {
      // Log the reusable enriched canvas JSON to console as requested
      const state = this.cs.exportCanvasJSON();
      console.log('--- EXPORTED CANVAS JSON ---');
      console.log(JSON.stringify(state, null, 2));
      console.log('---------------------------');

      // DownloadService now reads all data from CanvasService — no DOM element needed
      await this.dlSvc.downloadAsPng(
        this.cs.elements(),
        this.cs.canvasWidth(),
        this.cs.canvasHeight(),
        this.cs.canvasBg(),
        `${this.cs.templateName()}.png`
      );
    } catch (err) {
      console.error('Download failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      this.downloading = false;
    }
  }
}
