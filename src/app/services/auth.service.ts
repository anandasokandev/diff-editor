import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  // Add other fields if necessary
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private readonly BASE_URL = 'https://localhost:7012/api/Auth';
  private readonly TOKEN_KEY = 'auth_token';

  isAuthenticated = signal<boolean>(false);
  token = signal<string | null>(null);

  constructor(private http: HttpClient) {
    const savedToken = localStorage.getItem(this.TOKEN_KEY);
    if (savedToken) {
      this.token.set(savedToken);
      this.isAuthenticated.set(true);
    }
  }

  async sendOtp(email: string): Promise<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return firstValueFrom(this.http.post(`${this.BASE_URL}/send-otp`, JSON.stringify(email), { headers, responseType: 'text' }));
  }

  async verifyOtp(email: string, code: string): Promise<AuthResponse> {
    const payload: VerifyOtpRequest = { email, code };
    const res = await firstValueFrom(this.http.post<AuthResponse>(`${this.BASE_URL}/verify-otp`, payload));
    if (res.token) {
      this.saveToken(res.token);
    }
    return res;
  }

  async validate(email: string, token: string, ts: string): Promise<AuthResponse> {
    const params = new HttpParams()
      .set('email', email)
      .set('token', token)
      .set('ts', ts);

    const res = await firstValueFrom(this.http.get<AuthResponse>(`${this.BASE_URL}/validate`, { params }));
    if (res.token) {
      this.saveToken(res.token);
    }
    return res;
  }

  private saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.token.set(token);
    this.isAuthenticated.set(true);
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.token.set(null);
    this.isAuthenticated.set(false);
  }
}
