import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'pb-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './auth-shell.scss',
  template: `
    <div class="auth-wrap">
      <aside class="auth-side">
        <div>
          <h2>Your next game is a few taps away.</h2>
          <p class="mt-3 mb-0">Log in to book a court, check your reservations or manage your facility.</p>
        </div>
        <ul class="list-unstyled d-grid gap-3 mb-0">
          <li class="d-flex gap-3"><i class="bi bi-lightning-charge text-warning fs-5"></i><span>Live availability for every court</span></li>
          <li class="d-flex gap-3"><i class="bi bi-qr-code-scan text-warning fs-5"></i><span>Pay with the facility's GCash QR</span></li>
          <li class="d-flex gap-3"><i class="bi bi-bell text-warning fs-5"></i><span>Track your booking status</span></li>
        </ul>
      </aside>

      <section class="auth-main">
        <form class="auth-card" (ngSubmit)="submit()" novalidate>
          <h1>Log in</h1>
          <p class="text-secondary mb-4">New here? <a routerLink="/register" [queryParams]="returnUrl ? { returnUrl } : {}">Create an account</a></p>

          @if (error()) {
            <div class="alert alert-danger d-flex gap-2 py-2" role="alert"><i class="bi bi-exclamation-circle mt-1"></i><div>{{ error() }}</div></div>
          }

          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" class="form-control" type="email" name="email" [(ngModel)]="email" autocomplete="email" inputmode="email" required>
          </div>
          <div class="mb-4">
            <label class="form-label" for="password">Password</label>
            <div class="input-group">
              <input id="password" class="form-control" [type]="showPw() ? 'text' : 'password'" name="password" [(ngModel)]="password" autocomplete="current-password" required>
              <button type="button" class="btn btn-light border" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                <i [class]="showPw() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <button class="btn btn-primary btn-lg w-100" [disabled]="loading()">
            @if (loading()) { <span class="spinner-border" aria-hidden="true"></span> } Log in
          </button>

          @if (showDemo) {
            <div class="card bg-body-tertiary border-0 mt-4">
              <div class="card-body py-3">
                <div class="small fw-semibold mb-2"><i class="bi bi-info-circle me-1"></i>Demo accounts (development only)</div>
                <div class="d-flex flex-wrap gap-2">
                  <button type="button" class="btn btn-light btn-sm border" (click)="fill('player@picklebook.ph', 'Player@123')">Player</button>
                  <button type="button" class="btn btn-light btn-sm border" (click)="fill('owner@picklebook.ph', 'Owner@123')">Court owner</button>
                  <button type="button" class="btn btn-light btn-sm border" (click)="fill('admin@picklebook.ph', 'Admin@123')">Admin</button>
                </div>
              </div>
            </div>
          }
        </form>
      </section>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl') || '';
  showDemo = environment.showDemoAccounts;

  email = '';
  password = '';
  showPw = signal(false);
  loading = signal(false);
  error = signal('');

  fill(email: string, pw: string) { this.email = email; this.password = pw; }

  submit() {
    this.error.set('');
    if (!this.email.trim() || !this.password) { this.error.set('Enter your email and password.'); return; }
    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toast.success(`Welcome back, ${r.user.full_name.split(' ')[0]}`);
        this.router.navigateByUrl(this.returnUrl || this.auth.homeFor(r.user.role));
      },
      error: (e) => { this.loading.set(false); this.error.set(errMsg(e)); },
    });
  }
}
