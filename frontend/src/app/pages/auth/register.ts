import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'pb-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './auth-shell.scss',
  template: `
    <div class="auth-wrap">
      <aside class="auth-side">
        <div>
          @if (role() === 'owner') {
            <h2>Take bookings online, not through chat.</h2>
            <p class="mt-3 mb-0">List your facility, add your courts and GCash QR, and start accepting reservations once you're approved.</p>
          } @else {
            <h2>Book courts without the back-and-forth.</h2>
            <p class="mt-3 mb-0">A free account lets you reserve courts, pay with GCash and keep all your bookings in one place.</p>
          }
        </div>
        <p class="small mb-0">Already have an account? <a class="link-light" routerLink="/login">Log in</a></p>
      </aside>

      <section class="auth-main">
        <form class="auth-card" (ngSubmit)="submit()" novalidate>
          <h1>Create your account</h1>
          <p class="text-secondary mb-4">Already registered? <a routerLink="/login">Log in</a></p>

          <fieldset class="mb-4">
            <legend class="form-label">I want to</legend>
            <div class="row g-2">
              <label class="col-6 role-option">
                <input type="radio" name="role" value="player" [checked]="role() === 'player'" (change)="role.set('player')">
                <div class="card h-100"><div class="card-body p-3">
                  <i class="bi bi-calendar2-check fs-4 text-secondary"></i>
                  <div class="fw-bold mt-1">Book courts</div>
                  <div class="small text-secondary">Player account</div>
                </div></div>
              </label>
              <label class="col-6 role-option">
                <input type="radio" name="role" value="owner" [checked]="role() === 'owner'" (change)="role.set('owner')">
                <div class="card h-100"><div class="card-body p-3">
                  <i class="bi bi-shop fs-4 text-secondary"></i>
                  <div class="fw-bold mt-1">List my courts</div>
                  <div class="small text-secondary">Court owner</div>
                </div></div>
              </label>
            </div>
          </fieldset>

          @if (error()) {
            <div class="alert alert-danger d-flex gap-2 py-2" role="alert"><i class="bi bi-exclamation-circle mt-1"></i><div>{{ error() }}</div></div>
          }

          <div class="mb-3">
            <label class="form-label" for="name">Full name</label>
            <input id="name" class="form-control" name="full_name" [(ngModel)]="form.full_name" autocomplete="name" required>
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" class="form-control" type="email" name="email" [(ngModel)]="form.email" autocomplete="email" inputmode="email" required>
          </div>
          <div class="mb-3">
            <label class="form-label" for="phone">Mobile number</label>
            <input id="phone" class="form-control" name="phone" [(ngModel)]="form.phone" autocomplete="tel" inputmode="tel" placeholder="09XX XXX XXXX">
            <div class="form-text">Facilities use this to reach you about your booking.</div>
          </div>
          <div class="mb-4">
            <label class="form-label" for="pw">Password</label>
            <div class="input-group">
              <input id="pw" class="form-control" [type]="showPw() ? 'text' : 'password'" name="password" [(ngModel)]="form.password" autocomplete="new-password" required minlength="8">
              <button type="button" class="btn btn-light border" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                <i [class]="showPw() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <div class="form-text">At least 8 characters.</div>
          </div>

          @if (role() === 'owner') {
            <div class="card bg-body-tertiary border-0 mb-4">
              <div class="card-body">
                <div class="fw-bold mb-3"><i class="bi bi-shop me-2"></i>Your facility</div>
                <div class="mb-3">
                  <label class="form-label" for="fname">Facility name</label>
                  <input id="fname" class="form-control" name="facility_name" [(ngModel)]="form.facility_name">
                </div>
                <div class="mb-3">
                  <label class="form-label" for="faddr">Street address</label>
                  <input id="faddr" class="form-control" name="facility_address" [(ngModel)]="form.facility_address" autocomplete="street-address">
                </div>
                <div>
                  <label class="form-label" for="fcity">City</label>
                  <select id="fcity" class="form-select" name="facility_city" [(ngModel)]="form.facility_city">
                    @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
                <p class="small text-secondary mt-3 mb-0">You'll add courts, rates and your GCash QR after signing up. Your facility goes live once our team approves it.</p>
              </div>
            </div>
          }

          <button class="btn btn-primary btn-lg w-100" [disabled]="loading()">
            @if (loading()) { <span class="spinner-border" aria-hidden="true"></span> } Create account
          </button>
          <p class="small text-secondary text-center mt-3 mb-0">By signing up you agree to the PickleBook terms and privacy policy.</p>
        </form>
      </section>
    </div>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  cities = ['Cebu City', 'Mandaue City', 'Lapu-Lapu City', 'Talisay City', 'Consolacion', 'Liloan', 'Minglanilla'];
  role = signal<'player' | 'owner'>(this.route.snapshot.queryParamMap.get('as') === 'owner' ? 'owner' : 'player');
  form = { full_name: '', email: '', phone: '', password: '', facility_name: '', facility_address: '', facility_city: 'Cebu City' };
  showPw = signal(false);
  loading = signal(false);
  error = signal('');

  submit() {
    this.error.set('');
    const f = this.form;
    if (!f.full_name.trim() || !f.email.trim() || !f.password) { this.error.set('Fill in your name, email and password.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) { this.error.set('Enter a valid email address.'); return; }
    if (f.phone && !/^(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/.test(f.phone.trim())) { this.error.set('Enter a valid PH mobile number, for example 0917 123 4567.'); return; }
    if (f.password.length < 8) { this.error.set('Your password needs at least 8 characters.'); return; }
    if (this.role() === 'owner' && (!f.facility_name.trim() || !f.facility_address.trim())) { this.error.set('Enter your facility name and address.'); return; }

    this.loading.set(true);
    this.auth.register({ ...f, email: f.email.trim(), role: this.role() }).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toast.success(r.user.role === 'owner' ? 'Account created. Set up your courts while we review your facility.' : 'Account created');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || (r.user.role === 'owner' ? '/owner/facility' : '/courts'));
      },
      error: (e) => { this.loading.set(false); this.error.set(errMsg(e)); },
    });
  }
}
