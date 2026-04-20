import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AiService, TemplateCard } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-overlay">
      <div class="dashboard-shell">

        <!-- Header -->
        <div class="dash-header">
          <div class="dash-logo">
            <div class="dash-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="dash-brand">TempEditor</span>
          </div>
          <div class="dash-user">
            <div class="user-avatar">{{ initials() }}</div>
            <span class="user-email">{{ auth.email() }}</span>
            <button class="logout-btn" (click)="onLogout()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>

        <!-- Page title -->
        <div class="dash-title-row">
          <div>
            <h1 class="dash-title">Your Canvases</h1>
            <p class="dash-subtitle">Pick up where you left off, or start something new</p>
          </div>
          <button class="new-canvas-btn" (click)="onNewCanvas()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Canvas
          </button>
        </div>

        <!-- Loading state -->
        @if (loading()) {
          <div class="dash-loading">
            <div class="dash-spinner"></div>
            <span>Loading your designs…</span>
          </div>
        }

        <!-- Error state -->
        @if (!loading() && error()) {
          <div class="dash-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ error() }}
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && !error() && templates().length === 0) {
          <div class="dash-empty">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
            </div>
            <h3>No canvases yet</h3>
            <p>Create your first AI-powered design below</p>
            <button class="empty-cta" (click)="onNewCanvas()">
              Create First Canvas
            </button>
          </div>
        }

        <!-- Template grid -->
        @if (!loading() && templates().length > 0) {
          <div class="template-grid">
            @for (tpl of templates(); track tpl.id) {
              <div class="template-card" (click)="onLoad(tpl)">
                <!-- Canvas preview thumbnail -->
                <div class="card-preview" [style.background]="tpl.canvasBg || '#1a1a2e'">
                  @if (tpl.imageUrl) {
                    <img [src]="tpl.imageUrl" class="preview-img" alt="Template Preview" crossorigin="anonymous" />
                  } @else {
                    <div class="card-preview-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 9h6M9 12h6M9 15h4"/>
                      </svg>
                    </div>
                  }
                  <div class="card-preview-label">
                    {{ tpl.width }} × {{ tpl.height }}
                  </div>
                </div>
                <!-- Card info -->
                <div class="card-body">
                  <div class="card-name">{{ tpl.templateName || 'Untitled Design' }}</div>
                  <div class="card-meta">
                    <span class="card-size">{{ tpl.width }}×{{ tpl.height }}</span>
                    <span class="card-date">{{ formatDate(tpl.createdAt) }}</span>
                  </div>
                </div>

                <!-- Preview URL Display (New) -->
                @if (tpl.imageUrl) {
                  <div class="card-url-bar" (click)="$event.stopPropagation(); copyToClipboard(tpl.imageUrl)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span class="url-text">{{ tpl.imageUrl }}</span>
                  </div>
                }
                <!-- Hover overlay -->
                <div class="card-hover-overlay">
                  <div class="card-open-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    Open Canvas
                  </div>
                </div>
              </div>
            }
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #7c5cfc;
      --primary-light: rgba(124, 92, 252, 0.08);
      --surface: #ffffff;
      --surface2: #f8f9fc;
      --border: #e2e8f0;
      --text: #1a202c;
      --muted: #718096;
    }

    .dashboard-overlay {
      position: fixed;
      inset: 0;
      background: #f7fafc;
      z-index: 9998;
      overflow-y: auto;
    }

    .dashboard-shell {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 32px 64px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 0;
      animation: fadeInUp .4s cubic-bezier(.16,1,.3,1);
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .dash-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 36px;
    }

    .dash-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dash-logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary), #fc5c7d);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      svg { width: 22px; height: 22px; }
    }

    .dash-brand {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 22px;
      background: linear-gradient(135deg, #1a202c, #4a5568);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dash-user {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), #fc5c7d);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 13px;
      color: white;
    }

    .user-email {
      font-size: 13px;
      color: var(--muted);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 9px;
      color: var(--muted);
      font-size: 13px;
      font-family: 'Syne', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all .18s;
      svg { width: 15px; height: 15px; }
      &:hover {
        border-color: #cbd5e0;
        color: #ef4444;
        background: #fff5f5;
      }
    }

    /* ── Title row ── */
    .dash-title-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 32px;
    }

    .dash-title {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 32px;
      color: var(--text);
      margin: 0 0 6px;
      letter-spacing: -0.5px;
    }

    .dash-subtitle {
      font-size: 14px;
      color: var(--muted);
      margin: 0;
    }

    .new-canvas-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 22px;
      background: linear-gradient(135deg, var(--primary), #9b6bfc);
      border: none;
      border-radius: 12px;
      color: white;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(124,92,252,.35);
      transition: all .18s;
      svg { width: 18px; height: 18px; }
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(124,92,252,.45);
      }
      &:active { transform: translateY(0); }
    }

    /* ── Loading ── */
    .dash-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 80px 0;
      color: var(--muted);
      font-size: 14px;
    }

    .dash-spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(124,92,252,.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin .75s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Error ── */
    .dash-error {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      background: rgba(239,68,68,.08);
      border: 1px solid rgba(239,68,68,.2);
      border-radius: 12px;
      color: #ef4444;
      font-size: 14px;
      svg { width: 18px; height: 18px; flex-shrink: 0; }
    }

    /* ── Empty ── */
    .dash-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 100px 0;
      text-align: center;
    }

    .empty-icon {
      width: 72px; height: 72px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      margin-bottom: 8px;
      svg { width: 36px; height: 36px; }
    }

    .dash-empty h3 {
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 20px;
      color: var(--text);
      margin: 0;
    }

    .dash-empty p {
      font-size: 14px;
      color: var(--muted);
      margin: 0;
    }

    .empty-cta {
      margin-top: 8px;
      padding: 12px 28px;
      background: linear-gradient(135deg, var(--primary), #9b6bfc);
      border: none;
      border-radius: 12px;
      color: white;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(124,92,252,.3);
      transition: all .18s;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(124,92,252,.4);
      }
    }

    /* ── Template grid ── */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }

    .template-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      transition: all .22s cubic-bezier(.16,1,.3,1);
      animation: cardIn .35s cubic-bezier(.16,1,.3,1) both;

      &:hover {
        border-color: rgba(124,92,252,.3);
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0,0,0,.08), 0 0 0 1px rgba(124,92,252,.1);
      }

      &:hover .card-hover-overlay {
        opacity: 1;
      }
    }

    @keyframes cardIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    .card-preview {
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .card-preview-label {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,.5);
      backdrop-filter: blur(8px);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      font-family: 'Syne', sans-serif;
      font-weight: 600;
      color: rgba(255,255,255,.7);
    }

    .card-preview-icon {
      color: rgba(255,255,255,.15);
      svg { width: 52px; height: 52px; }
    }
    
    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .card-body {
      padding: 14px 16px 16px;
    }

    .card-url-bar {
      margin: 0 16px 16px;
      padding: 8px 10px;
      background: var(--surface2);
      border: 1px dashed var(--border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: copy;
      transition: all 0.2s;
      
      svg { width: 14px; height: 14px; color: var(--primary); flex-shrink: 0; }
      
      .url-text {
        font-size: 11px;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
      }
      
      &:hover {
        background: var(--primary-light);
        border-color: var(--primary);
        .url-text { color: var(--primary); }
      }
    }

    .card-name {
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 6px;
    }

    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-size {
      font-size: 11px;
      color: var(--muted);
      font-family: 'Syne', sans-serif;
      background: var(--surface2);
      padding: 2px 8px;
      border-radius: 5px;
    }

    .card-date {
      font-size: 11px;
      color: var(--muted);
    }

    /* Hover overlay */
    .card-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(13,13,20,.82);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity .2s;
    }

    .card-open-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, var(--primary), #9b6bfc);
      border-radius: 12px;
      color: white;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 8px 24px rgba(124,92,252,.4);
      svg { width: 18px; height: 18px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  templates = signal<TemplateCard[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    public auth: AuthService,
    private ai: AiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchTemplates();
  }

  initials(): string {
    const email = this.auth.email() ?? '';
    return email.charAt(0).toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  private async fetchTemplates() {
    const email = this.auth.email();
    if (!email) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await this.ai.getUserTemplates(email);
      this.templates.set(list);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Failed to load your canvases');
    } finally {
      this.loading.set(false);
    }
  }

  onLoad(tpl: TemplateCard) {
    this.router.navigate(['/canvas', tpl.id]);
  }

  onNewCanvas() {
    this.router.navigate(['/canvas']);
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // Optional: Add a toast notification here if you have one
      console.log('URL copied to clipboard');
    });
  }
}
