import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-overlay">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-area">
            <div class="logo-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h1>TempEditor</h1>
          </div>
          <p class="subtitle">{{ step() === 'email' ? 'Welcome back, please sign in' : 'Verify your identity' }}</p>
        </div>

        <div class="login-body">
          <!-- Step 1: Email -->
          <div *ngIf="step() === 'email'" class="input-step" [@fadeSlide]>
            <div class="input-group">
              <label for="email">Email Address</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input 
                  type="email" 
                  id="email" 
                  [(ngModel)]="email" 
                  placeholder="name@company.com"
                  (keyup.enter)="sendOtp()"
                  [disabled]="loading()"
                >
              </div>
            </div>
            <button class="primary-btn" (click)="sendOtp()" [disabled]="!email || loading()">
              <span *ngIf="!loading()">Send OTP</span>
              <div *ngIf="loading()" class="spinner"></div>
            </button>
          </div>

          <!-- Step 2: OTP -->
          <div *ngIf="step() === 'otp'" class="input-step" [@fadeSlide]>
            <div class="input-group">
              <div class="label-row">
                <label for="otp">One-Time Password</label>
                <button class="text-btn" (click)="step.set('email')">Change Email</button>
              </div>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input 
                  type="text" 
                  id="otp" 
                  [(ngModel)]="otp" 
                  placeholder="000000"
                  maxlength="6"
                  (keyup.enter)="verifyOtp()"
                  [disabled]="loading()"
                >
              </div>
              <p class="hint">We've sent a 6-digit code to {{ email }}</p>
            </div>
            <button class="primary-btn" (click)="verifyOtp()" [disabled]="otp.length < 4 || loading()">
              <span *ngIf="!loading()">Verify & Continue</span>
              <div *ngIf="loading()" class="spinner"></div>
            </button>
          </div>
          
          <div *ngIf="error()" class="error-msg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ error() }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #7c5cfc;
      --primary-hover: #6b4ae0;
      --bg-card: rgba(19, 19, 26, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --text: #ffffff;
      --text-muted: #8a8a9e;
      --error: #ff4d4d;
    }

    .login-overlay {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(20px);
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 48px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 32px;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes cardEnter {
      from { opacity: 0; transform: scale(0.95) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .login-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .logo-circle {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary), #fc5c7d);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 12px 24px rgba(124, 92, 252, 0.3);
    }

    .logo-circle svg { width: 32px; height: 32px; }

    h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(to right, #fff, #8a8a9e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .subtitle {
      font-size: 15px;
      color: var(--text-muted);
      margin: 0;
    }

    .input-group {
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: #ccc;
      margin-left: 4px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 16px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      pointer-events: none;
    }

    input {
      width: 100%;
      height: 52px;
      padding: 0 16px 0 48px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 14px;
      color: white;
      font-size: 16px;
      outline: none;
      transition: all 0.2s;
    }

    input:focus {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(124, 92, 252, 0.15);
    }

    .primary-btn {
      width: 100%;
      height: 52px;
      background: linear-gradient(to right, var(--primary), #9b6bfc);
      border: none;
      border-radius: 14px;
      color: white;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      box-shadow: 0 8px 20px rgba(124, 92, 252, 0.25);
    }

    .primary-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(124, 92, 252, 0.35);
    }

    .primary-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    .text-btn {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .text-btn:hover { text-decoration: underline; }

    .hint {
      font-size: 12px;
      color: var(--text-muted);
      margin: 4px 0 0 4px;
    }

    .error-msg {
      margin-top: 20px;
      padding: 12px 16px;
      background: rgba(255, 77, 77, 0.1);
      border: 1px solid rgba(255, 77, 77, 0.2);
      border-radius: 12px;
      color: var(--error);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .error-msg svg { width: 16px; height: 16px; }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  step = signal<'email' | 'otp'>('email');
  email = '';
  otp = '';
  loading = signal(false);
  error = signal<string | null>(null);

  loginSuccess = output<void>();

  constructor(private auth: AuthService) {}

  async sendOtp() {
    if (!this.email) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.sendOtp(this.email);
      this.step.set('otp');
    } catch (err: any) {
      this.error.set(err.error?.message || 'Failed to send OTP. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async verifyOtp() {
    if (!this.otp) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.verifyOtp(this.email, this.otp);
      this.loginSuccess.emit();
    } catch (err: any) {
      this.error.set(err.error?.message || 'Invalid OTP. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
