import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'pb-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './auth.scss',
  template: `
    <div class="auth">
      <aside class="visual">
        <div class="court"></div>
        <div class="ball"></div>
        <div class="visual-copy">
          <span class="eyebrow" style="color: var(--lime)">Join PickleBook</span>
          @if (role() === 'owner') {
            <h2>Fill your courts. <em>Empty your inbox.</em></h2>
            <p>List your facility, upload your GCash QR and start accepting online bookings. A super admin reviews new facilities before they go live.</p>
          } @else {
            <h2>Less messaging. <em>More playing.</em></h2>
            <p>Create a free player account to book courts, pay with GCash and track all your reservations in one place.</p>
          }
        </div>
        <div class="quote">“Players see our schedule before they message us. Halos wala na kaming double booking.”<b>— Mark, facility manager</b></div>
      </aside>

      <section class="panel">
        <form class="form-card rise" (ngSubmit)="submit()" novalidate>
          <h1>Create account</h1>
          <p class="sub">Already have one? <a routerLink="/login">Log in</a></p>

          <div class="roles" role="radiogroup" aria-label="Account type">
            <button type="button" class="role" [class.active]="role() === 'player'" (click)="role.set('player')" role="radio" [attr.aria-checked]="role() === 'player'">
              <span class="ico">🏓</span><b>Player</b><span>Book and play</span>
            </button>
            <button type="button" class="role" [class.active]="role() === 'owner'" (click)="role.set('owner')" role="radio" [attr.aria-checked]="role() === 'owner'">
              <span class="ico">⌂</span><b>Court owner</b><span>List my facility</span>
            </button>
          </div>

          <div class="field">
            <label for="name">Full name</label>
            <input id="name" class="input" name="full_name" [(ngModel)]="form.full_name" required placeholder="Juan Dela Cruz" autocomplete="name">
          </div>
          <div class="form-row cols-2">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" class="input" type="email" name="email" [(ngModel)]="form.email" required placeholder="you@email.com" autocomplete="email">
            </div>
            <div class="field">
              <label for="phone">Mobile number</label>
              <input id="phone" class="input" name="phone" [(ngModel)]="form.phone" placeholder="09XX XXX XXXX" autocomplete="tel" inputmode="tel">
            </div>
          </div>
          <div class="field">
            <label for="pw">Password</label>
            <div class="pw-wrap">
              <input id="pw" class="input" [type]="showPw() ? 'text' : 'password'" name="password" [(ngModel)]="form.password" (ngModelChange)="pw.set($event)" required placeholder="At least 8 characters" autocomplete="new-password">
              <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())">{{ showPw() ? 'Hide' : 'Show' }}</button>
            </div>
            <div class="strength"><i [style.width.%]="strength().pct" [style.background]="strength().color"></i></div>
            <span class="hint">{{ strength().label }}</span>
          </div>

          @if (role() === 'owner') {
            <div class="owner-fields">
              <h4>Your facility</h4>
              <div class="field">
                <label for="fname">Facility name</label>
                <input id="fname" class="input" name="facility_name" [(ngModel)]="form.facility_name" placeholder="e.g. Dink Yard Cebu">
              </div>
              <div class="form-row cols-2">
                <div class="field">
                  <label for="faddr">Address</label>
                  <input id="faddr" class="input" name="facility_address" [(ngModel)]="form.facility_address" placeholder="Street, barangay">
                </div>
                <div class="field">
                  <label for="fcity">City</label>
                  <select id="fcity" class="select" name="facility_city" [(ngModel)]="form.facility_city">
                    @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
              </div>
              <span class="hint">You can add courts, opening hours and your GCash QR after signing up.</span>
            </div>
          }

          <p class="terms">By creating an account you agree to PickleBook's terms and privacy policy.</p>
          @if (error()) { <p class="error-text" style="margin-bottom: 14px">{{ error() }}</p> }

          <button class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> }
            {{ role() === 'owner' ? 'Create owner account' : 'Create player account' }}
          </button>
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
  pw = signal('');
  showPw = signal(false);
  loading = signal(false);
  error = signal('');

  strength = computed(() => {
    const p = this.pw();
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const map = [
      { label: 'Use at least 8 characters', color: '#dc2626' },
      { label: 'Weak', color: '#f97316' },
      { label: 'Okay', color: '#eab308' },
      { label: 'Strong', color: '#22c55e' },
      { label: 'Very strong', color: '#15803d' },
    ];
    return { ...map[p.length < 8 ? 0 : score], pct: p ? Math.max(10, score * 25) : 0 };
  });

  submit() {
    this.error.set('');
    const f = this.form;
    if (!f.full_name.trim() || !f.email.trim() || !f.password) return this.error.set('Please fill in your name, email and password.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return this.error.set('Please enter a valid email.');
    if (f.password.length < 8) return this.error.set('Password must be at least 8 characters.');
    if (this.role() === 'owner' && (!f.facility_name.trim() || !f.facility_address.trim()))
      return this.error.set('Please enter your facility name and address.');

    this.loading.set(true);
    this.auth.register({ ...f, role: this.role() }).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toast.success(r.user.role === 'owner'
          ? 'Account created! Your facility is waiting for admin approval.'
          : `Welcome to PickleBook, ${r.user.full_name.split(' ')[0]}!`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || this.auth.homeFor(r.user.role));
      },
      error: (e) => { this.loading.set(false); this.error.set(errMsg(e)); },
    });
  }
}
