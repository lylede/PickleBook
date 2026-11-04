import { Component, input } from '@angular/core';

@Component({
  selector: 'pb-logo',
  standalone: true,
  template: `
    <span class="logo" [class.dark]="dark()">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" class="tile" />
        <path d="M22 14h14c8 0 13 5 13 12s-5 12-13 12h-7v12h-7z" class="p" />
        <circle cx="35.5" cy="26" r="5" class="tile" />
      </svg>
      <span class="word">Pickle<b>Book</b></span>
    </span>
  `,
  styles: [`
    .logo { display: inline-flex; align-items: center; gap: 10px; }
    svg { width: 34px; height: 34px; flex: none; }
    .tile { fill: var(--lime); }
    .p { fill: var(--forest); }
    .word { font-family: var(--font-display); font-weight: 700; font-size: 19px; letter-spacing: -.03em; color: #fff; }
    .word b { color: var(--lime); font-weight: 700; }
    .dark .word { color: var(--ink); }
    .dark .word b { color: var(--court); }
    .dark .tile { fill: var(--forest); }
    .dark .p { fill: var(--lime); }
  `],
})
export class Logo {
  dark = input(false);
}
