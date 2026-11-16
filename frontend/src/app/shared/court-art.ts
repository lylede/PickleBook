import { Component } from '@angular/core';

/** Top-down pickleball court (20 x 44 ft, 7 ft kitchen each side). Used where a facility has no photo. */
@Component({
  selector: 'pb-court-art',
  standalone: true,
  template: `
    <svg viewBox="0 0 260 130" preserveAspectRatio="xMidYMid slice" class="d-block w-100 h-100" aria-hidden="true">
      <rect width="260" height="130" fill="#0b3d2a" />
      <rect x="20" y="15" width="220" height="100" fill="#17824b" />
      <rect x="95" y="15" width="70" height="100" fill="#0f6a3c" />
      <g fill="none" stroke="#ffffff" stroke-width="1.6">
        <rect x="20" y="15" width="220" height="100" />
        <path d="M95 15v100M165 15v100M20 65h75M165 65h75" />
      </g>
      <path d="M130 9v112" stroke="#c6e84a" stroke-width="2.4" />
    </svg>
  `,
  styles: [`:host { display: block; overflow: hidden; }`],
})
export class CourtArt {}
