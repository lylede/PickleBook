import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { Role, User } from './models';

const TOKEN_KEY = 'pb_token';
const USER_KEY = 'pb_user';

function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly user = signal<User | null>(read<User>(USER_KEY));
  readonly isLoggedIn = computed(() => !!this.user());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  private save(token: string, user: User) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* storage unavailable */ }
    this.user.set(user);
  }

  login(email: string, password: string) {
    return this.api.login({ email, password }).pipe(tap((r) => this.save(r.token, r.user)));
  }

  register(body: any) {
    return this.api.register(body).pipe(tap((r) => this.save(r.token, r.user)));
  }

  logout(redirect = true) {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    this.user.set(null);
    if (redirect) this.router.navigate(['/']);
  }

  /** Where each role lands after logging in */
  homeFor(role: Role | null | undefined): string {
    if (role === 'admin') return '/admin';
    if (role === 'owner') return '/owner';
    return '/courts';
  }
}
