import { Component, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';

export interface TemplateConfig {
    name: string;
    width: number;
    height: number;
    preset?: string;
}

interface SizePreset {
    label: string;
    sub: string;
    w: number;
    h: number;
    icon: string;
}

@Component({
    selector: 'app-template-setup',
    imports: [FormsModule],
    template: `
    <div class="overlay" (click)="onOverlayClick($event)">
      <div class="modal">
        <!-- Header -->
        <div class="modal-header">
          <div class="logo-area">
            <span class="logo-icon">✦</span>
            <span class="logo-text">Craftly</span>
          </div>
          <h1 class="modal-title">Create a new design</h1>
          <p class="modal-sub">Choose a template size or set custom dimensions to get started.</p>
        </div>
    
        <!-- Search-like template name -->
        <div class="name-row">
          <label class="field-label">Design Name</label>
          <input
            class="name-input"
            [(ngModel)]="config.name"
            placeholder="My New Design"
            maxlength="60"
            />
          </div>
    
          <!-- Quick size presets -->
          <div class="section-title">Quick Sizes</div>
          <div class="presets-grid">
            @for (p of sizePresets; track p) {
              <div
                class="size-card"
                [class.active]="selectedPreset === p.label"
                (click)="selectPreset(p)"
                >
                <div class="size-icon">{{ p.icon }}</div>
                <div class="size-details">
                  <div class="size-label">{{ p.label }}</div>
                  <div class="size-dims">{{ p.w }} × {{ p.h }}px</div>
                  <div class="size-sub">{{ p.sub }}</div>
                </div>
              </div>
            }
          </div>
    
          <!-- Custom dimensions -->
          <div class="section-title">Custom Size</div>
          <div class="dim-row">
            <div class="dim-field">
              <label class="field-label">Width (px)</label>
              <div class="dim-input-wrap">
                <input
                  type="number"
                  class="dim-input"
                  [(ngModel)]="config.width"
                  min="100" max="5000"
                  (input)="selectedPreset = ''"
                  />
                  <span class="dim-unit">px</span>
                </div>
              </div>
              <div class="dim-sep">×</div>
              <div class="dim-field">
                <label class="field-label">Height (px)</label>
                <div class="dim-input-wrap">
                  <input
                    type="number"
                    class="dim-input"
                    [(ngModel)]="config.height"
                    min="100" max="5000"
                    (input)="selectedPreset = ''"
                    />
                    <span class="dim-unit">px</span>
                  </div>
                </div>
                <div class="dim-preview" [style.aspect-ratio]="config.width + '/' + config.height">
                  <div class="dim-preview-inner">
                    <span>{{ config.width }}×{{ config.height }}</span>
                  </div>
                </div>
              </div>
    
              <!-- Footer -->
              <div class="modal-footer">
                <div class="footer-info">
                  <span class="info-chip">{{ config.width }} × {{ config.height }} px</span>
                </div>
                <button class="create-btn" (click)="onCreate()" [disabled]="!config.name.trim()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create Design
                </button>
              </div>
            </div>
          </div>
    `,
    styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
      animation: fadeOverlay .2s ease;
    }
    @keyframes fadeOverlay {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .modal {
      background: #13131a;
      border: 1px solid #252535;
      border-radius: 20px;
      width: 720px;
      max-width: 94vw;
      max-height: 90vh;
      overflow-y: auto;
      padding: 36px 40px 28px;
      box-shadow: 0 40px 120px rgba(0,0,0,.8), 0 0 0 1px rgba(124,92,252,.1);
      animation: slideUp .25s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header { text-align: center; margin-bottom: 28px; }
    .logo-area {
      display: flex; align-items: center; justify-content: center;
      gap: 7px; margin-bottom: 18px;
    }
    .logo-icon {
      font-size: 22px;
      background: linear-gradient(135deg,#7c5cfc,#fc5c7d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .logo-text {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 20px;
      background: linear-gradient(135deg,#7c5cfc,#fc5c7d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .modal-title {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 26px;
      color: #eeeef8; margin-bottom: 8px;
    }
    .modal-sub { font-size: 13.5px; color: #5a5a78; }

    /* Name */
    .name-row { margin-bottom: 24px; }
    .field-label {
      display: block;
      font-size: 10.5px; font-family: 'Syne', sans-serif;
      font-weight: 700; color: #5a5a78;
      text-transform: uppercase; letter-spacing: .06em;
      margin-bottom: 7px;
    }
    .name-input {
      width: 100%; height: 42px;
      background: #1a1a24; border: 1px solid #252535;
      border-radius: 10px; color: #eeeef8;
      font-size: 14.5px; padding: 0 14px;
      transition: border-color .15s;
      &:focus { border-color: #7c5cfc; box-shadow: 0 0 0 3px rgba(124,92,252,.12); }
    }

    /* Presets */
    .section-title {
      font-size: 10.5px; font-family: 'Syne', sans-serif;
      font-weight: 700; color: #5a5a78;
      text-transform: uppercase; letter-spacing: .06em;
      margin-bottom: 12px;
    }
    .presets-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 24px;
    }
    .size-card {
      background: #1a1a24; border: 1.5px solid #252535;
      border-radius: 12px; padding: 14px 10px;
      cursor: pointer; transition: all .18s;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 8px;
      &:hover { border-color: #7c5cfc; transform: translateY(-2px); background: #1e1e2c; }
      &.active { border-color: #7c5cfc; background: rgba(124,92,252,.1); box-shadow: 0 0 0 3px rgba(124,92,252,.12); }
    }
    .size-icon { font-size: 22px; }
    .size-label { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 11px; color: #eeeef8; }
    .size-dims { font-size: 10px; color: #5a5a78; font-family: 'DM Sans', sans-serif; }
    .size-sub { font-size: 9.5px; color: #3e3e54; }

    /* Custom dims */
    .dim-row {
      display: flex; align-items: flex-end; gap: 14px;
      margin-bottom: 28px;
    }
    .dim-field { flex: 1; }
    .dim-sep {
      font-size: 18px; color: #3e3e54;
      padding-bottom: 6px;
    }
    .dim-input-wrap {
      position: relative;
    }
    .dim-input {
      width: 100%; height: 42px;
      background: #1a1a24; border: 1px solid #252535;
      border-radius: 10px; color: #eeeef8;
      font-size: 15px; padding: 0 40px 0 14px;
      transition: border-color .15s;
      &:focus { border-color: #7c5cfc; box-shadow: 0 0 0 3px rgba(124,92,252,.12); }
      &::-webkit-outer-spin-button, &::-webkit-inner-spin-button { -webkit-appearance: none; }
    }
    .dim-unit {
      position: absolute; right: 12px; top: 50%;
      transform: translateY(-50%);
      font-size: 11px; color: #5a5a78;
      font-family: 'Syne', sans-serif; pointer-events: none;
    }
    .dim-preview {
      width: 54px; height: 54px;
      background: #1a1a24; border: 1.5px solid #252535;
      border-radius: 8px; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      font-size: 7px; color: #3e3e54;
      flex-shrink: 0;
      max-width: 54px; max-height: 54px;
    }
    .dim-preview-inner {
      width: 100%; height: 100%;
      background: linear-gradient(135deg,rgba(124,92,252,.15),rgba(252,92,125,.1));
      display: flex; align-items: center; justify-content: center;
      font-size: 7.5px; color: #5a5a78;
      font-family: 'Syne', sans-serif; text-align: center;
    }

    /* Footer */
    .modal-footer {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid #252535; padding-top: 20px;
    }
    .info-chip {
      background: #1a1a24; border: 1px solid #252535;
      border-radius: 20px; padding: 5px 12px;
      font-size: 11px; color: #5a5a78;
      font-family: 'Syne', sans-serif;
    }
    .create-btn {
      height: 42px; padding: 0 24px;
      background: linear-gradient(135deg,#7c5cfc,#9b6bfc);
      border: none; border-radius: 10px;
      color: #fff; font-family: 'Syne', sans-serif;
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; gap: 8px;
      transition: all .18s;
      &:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,92,252,.4); }
      &:disabled { opacity: .4; cursor: not-allowed; }
    }
  `]
})
export class TemplateSetupComponent {
    @Output() created = new EventEmitter<TemplateConfig>();

    config: TemplateConfig = {
        name: 'Untitled Design',
        width: 1080,
        height: 1080,
    };

    selectedPreset = 'Instagram Post';

    sizePresets: SizePreset[] = [
        { label: 'Instagram Post', sub: 'Social', w: 1080, h: 1080, icon: '📸' },
        { label: 'Instagram Story', sub: 'Social', w: 1080, h: 1920, icon: '📱' },
        { label: 'Facebook Post', sub: 'Social', w: 1200, h: 628, icon: '👍' },
        { label: 'YouTube Thumb', sub: 'Video', w: 1280, h: 720, icon: '▶️' },
        { label: 'Twitter/X Post', sub: 'Social', w: 1600, h: 900, icon: '🐦' },
        { label: 'A4 Document', sub: 'Print', w: 2480, h: 3508, icon: '📄' },
        { label: 'Business Card', sub: 'Print', w: 1050, h: 600, icon: '💼' },
        { label: 'Poster', sub: 'Print', w: 1587, h: 2245, icon: '🎨' },
        { label: 'Presentation', sub: 'Slides', w: 1920, h: 1080, icon: '📊' },
        { label: 'Email Header', sub: 'Email', w: 600, h: 200, icon: '📧' },
    ];

    selectPreset(p: SizePreset) {
        this.selectedPreset = p.label;
        this.config.width = p.w;
        this.config.height = p.h;
    }

    onOverlayClick(e: MouseEvent) {
        // Don't close on overlay click — force user to create
    }

    onCreate() {
        if (!this.config.name.trim()) return;
        this.created.emit({ ...this.config });
    }
}
