import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'pb-account',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container page" style="max-width: 640px">
      <h1 class="page-title mb-3">Account</h1>

      <form class="card mb-3" (ngSubmit)="saveProfile()">
        <div class="card-header">Profile</div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label" for="name">Full name</label>
            <input id="name" class="form-control" name="name" [(ngModel)]="name" autocomplete="name">
          </div>
          <div class="mb-3">
            <label class="form-label" for="phone">Mobile number</label>
            <input id="phone" class="form-control" name="phone" [(ngModel)]="phone" inputmode="tel" autocomplete="tel">
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" class="form-control" [value]="auth.user()?.email" disabled>
            <div class="form-text">Contact support to change your email.</div>
          </div>
          <button class="btn btn-primary" [disabled]="savingProfile()">@if (savingProfile()) { <span class="spinner-border" aria-hidden="true"></span> } Save</button>
        </div>
      </form>

      <form class="card mb-3" (ngSubmit)="savePassword()">
        <div class="card-header">Password</div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label" for="cur">Current password</label>
            <input id="cur" type="password" class="form-control" name="cur" [(ngModel)]="currentPw" autocomplete="current-password">
          </div>
          <div class="mb-3">
            <label class="form-label" for="new">New password</label>
            <input id="new" type="password" class="form-control" name="new" [(ngModel)]="newPw" autocomplete="new-password">
            <div class="form-text">At least 8 characters.</div>
          </div>
          <button class="btn btn-light border" [disabled]="savingPw()">@if (savingPw()) { <span class="spinner-border" aria-hidden="true"></span> } Change password</button>
        </div>
      </form>

      <button class="btn btn-light border w-100 text-danger" (click)="auth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Log out</button>
    </div>
  `,
})
export class AccountPage {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  name = this.auth.user()?.full_name || '';
  phone = this.auth.user()?.phone || '';
  currentPw = '';
  newPw = '';
  savingProfile = signal(false);
  savingPw = signal(false);

  saveProfile() {
    if (!this.name.trim()) { this.toast.error('Enter your name.'); return; }
    this.savingProfile.set(true);
    this.api.updateProfile({ full_name: this.name.trim(), phone: this.phone.trim() }).subscribe({
      next: (r) => { this.savingProfile.set(false); this.auth.setUser(r.user); this.toast.success('Profile saved'); },
      error: (e) => { this.savingProfile.set(false); this.toast.error(errMsg(e)); },
    });
  }

  savePassword() {
    if (!this.currentPw || this.newPw.length < 8) { this.toast.error('Enter your current password and a new one with at least 8 characters.'); return; }
    this.savingPw.set(true);
    this.api.changePassword({ current_password: this.currentPw, new_password: this.newPw }).subscribe({
      next: () => { this.savingPw.set(false); this.currentPw = ''; this.newPw = ''; this.toast.success('Password changed'); },
      error: (e) => { this.savingPw.set(false); this.toast.error(errMsg(e)); },
    });
  }
}
