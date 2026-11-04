import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'pb-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './auth.scss',
  template: `
    <div class="auth">
      <aside class="visual">
        <div class="court"></div>
        <div class="ball"></div>
        <div class="visual-copy">
          <span class="eyebrow" style="color: var(--lime)">Welcome back</span>
          <h2>Your court is <em>waiting.</em></h2>
          <p>Log in to book a slot, check your reservations or manage your facility.</p>
        </div>
        <div class="quote">“Dati, ilang oras ako naghihintay ng reply. Ngayon, 20 seconds lang naka-book na kami.”<b>— Miguel, recreational player</b></div>
      </aside>

      <section class="panel">
        <form class="form-card rise" (ngSubmit)="submit()" #f="ngForm" novalidate>
          <h1>Log in</h1>
          <p class="sub">New to PickleBook? <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl }">Create an account</a></p>

          <div class="field">
            <label for="email">Email</label>
            <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" placeholder="you@email.com">
          </div>
          <div class="field">
            <label for="password">Password</label>
            <div class="pw-wrap">
              <input id="password" class="input" [type]="showPw() ? 'text' : 'password'" name="password" [(ngModel)]="password" required autocomplete="current-password" placeholder="••••••••">
              <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())">{{ showPw() ? 'Hide' : 'Show' }}</button>
            </div>
          </div>

          @if (error()) { <p class="error-text" style="margin-bottom: 14px">{{ error() }}</p> }

          <button class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> } Log in
          </button>

          <div class="demo">
            <b>Demo accounts</b> (after running <code>npm run db:setup</code>)
            <div class="demo-btns">
              <button type="button" class="btn btn-outline btn-sm" (click)="fill('player@picklebook.ph', 'Player@123')">Player</button>
              <button type="button" class="btn btn-outline btn-sm" (click)="fill('owner@picklebook.ph', 'Owner@123')">Court owner</button>
              <button type="button" class="btn btn-outline btn-sm" (click)="fill('admin@picklebook.ph', 'Admin@123')">Super admin</button>
            </div>
          </div>
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

  email = '';
  password = '';
  showPw = signal(false);
  loading = signal(false);
  error = signal('');

  fill(email: string, pw: string) { this.email = email; this.password = pw; }

  submit() {
    this.error.set('');
    if (!this.email || !this.password) { this.error.set('Enter your email and password.'); return; }
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toast.success(`Welcome back, ${r.user.full_name.split(' ')[0]}!`);
        this.router.navigateByUrl(this.returnUrl || this.auth.homeFor(r.user.role));
      },
      error: (e) => { this.loading.set(false); this.error.set(errMsg(e)); },
    });
  }
}
