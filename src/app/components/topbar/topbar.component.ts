import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../services/canvas.service';
import { DownloadService } from '../../services/download.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <!-- Left: Logo + New Design -->
      <div class="left-area">
        <div class="logo" (click)="newDesign.emit()">
          <span class="logo-mark">✦</span>
          <span class="logo-text">Craftly</span>
        </div>
        <button class="btn ghost" (click)="newDesign.emit()" title="Create new design">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New
        </button>

        <div class="divider"></div>

        <!-- Template name -->
        <span class="template-name">{{ cs.templateName() }}</span>
        <span class="canvas-dims">{{ cs.canvasWidth() }} × {{ cs.canvasHeight() }}</span>
      </div>

      <!-- Center: Undo/Redo + zoom -->
      <div class="center-area">
        <div class="toolbar-group">
          <button class="tb-btn" title="Undo (Ctrl+Z)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v6h6"/>
              <path d="M3 13C5.2 8.6 9.3 6 14 6c4.4 0 8 3.6 8 8s-3.6 8-8 8"/>
            </svg>
          </button>
          <button class="tb-btn" title="Redo (Ctrl+Y)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 7v6h-6"/>
              <path d="M21 13C18.8 8.6 14.7 6 10 6c-4.4 0-8 3.6-8 8s3.6 8 8 8"/>
            </svg>
          </button>
        </div>

        <div class="divider"></div>

        <!-- Zoom -->
        <div class="zoom-cluster">
          <button class="tb-btn" (click)="cs.zoomOut()" title="Zoom out">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button class="zoom-pct" (click)="cs.zoomReset()" title="Reset zoom">{{ zoomPct }}%</button>
          <button class="tb-btn" (click)="cs.zoomIn()" title="Zoom in">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Right: Actions -->
      <div class="right-area">
        <button class="btn ghost" (click)="openAiModal.emit()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          AI Generate
        </button>

        <button class="btn ghost" (click)="openImgModal.emit()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Image
        </button>

        <div class="divider"></div>

        <button class="btn download"
          [class.loading]="downloading"
          (click)="download()"
          [disabled]="downloading">
          <span class="spinner" *ngIf="downloading"></span>
          <svg *ngIf="!downloading" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ downloading ? 'Exporting…' : 'Download PNG' }}
        </button>

        <input #fileInput type="file" accept="image/*" style="display:none"
               (change)="onFileChange($event)" />
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 52px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 0;
      flex-shrink: 0;
      z-index: 100;
    }

    .left-area, .center-area, .right-area {
      display: flex; align-items: center; gap: 6px;
    }
    .left-area { flex: 1; }
    .center-area { justify-content: center; }
    .right-area { flex: 1; justify-content: flex-end; }

    .logo {
      display: flex; align-items: center; gap: 6px;
      cursor: pointer; margin-right: 4px; flex-shrink: 0;
    }
    .logo-mark {
      font-size: 18px;
      background: linear-gradient(135deg, #7c5cfc, #fc5c7d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .logo-text {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 16px;
      background: linear-gradient(135deg, #7c5cfc, #fc5c7d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .template-name {
      font-family: 'Syne', sans-serif;
      font-weight: 600; font-size: 12.5px;
      color: var(--text); max-width: 160px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .canvas-dims {
      font-size: 10px; color: var(--muted);
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 4px; padding: 2px 7px;
      font-family: 'Syne', sans-serif;
    }

    .divider { width: 1px; height: 22px; background: var(--border); margin: 0 4px; }

    .btn {
      height: 30px; padding: 0 11px;
      border-radius: 7px; border: 1px solid var(--border);
      background: transparent; color: var(--text);
      font-size: 12px; display: flex; align-items: center; gap: 5px;
      white-space: nowrap;
      &:hover { background: var(--panel); border-color: var(--accent); }
    }
    .btn.ghost { border-color: transparent; &:hover { border-color: var(--border); } }

    .toolbar-group { display: flex; gap: 2px; }
    .tb-btn {
      width: 30px; height: 30px; border-radius: 6px;
      border: none; background: transparent; color: var(--text);
      display: flex; align-items: center; justify-content: center;
      &:hover { background: var(--panel); }
    }

    .zoom-cluster { display: flex; align-items: center; gap: 2px; }
    .zoom-pct {
      min-width: 46px; height: 30px; border-radius: 6px;
      border: none; background: transparent; color: var(--muted);
      font-size: 11px; font-family: 'Syne', sans-serif;
      text-align: center;
      &:hover { background: var(--panel); color: var(--text); }
    }

    .btn.download {
      background: linear-gradient(135deg, #10b981, #059669);
      border-color: transparent; color: #fff;
      font-weight: 600;
      &:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      &:disabled { opacity: 0.6; cursor: wait; }
    }
    .spinner {
      width: 11px; height: 11px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
  `]
})
export class TopbarComponent {
  @Output() openAiModal = new EventEmitter<void>();
  @Output() openImgModal = new EventEmitter<void>();
  @Output() newDesign = new EventEmitter<void>();

  downloading = false;

  constructor(public cs: CanvasService, private dlSvc: DownloadService) { }

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

  async download() {
    this.downloading = true;
    try {
      // DownloadService now reads all data from CanvasService — no DOM element needed
      await this.dlSvc.downloadAsPng(null as any, `${this.cs.templateName()}.png`);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      this.downloading = false;
    }
  }
}
