import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pb-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-hero nf">
      <div class="container">
        <span class="big">4<i></i>4</span>
        <h1>Out of bounds!</h1>
        <p>This page doesn't exist. Let's get you back on the court.</p>
        <a routerLink="/" class="btn btn-lime btn-lg" style="margin-top: 24px">Back home</a>
      </div>
    </section>
  `,
  styles: [`
    .nf { min-height: 100svh; display: grid; place-items: center; text-align: center; }
    .nf p { margin-left: auto; margin-right: auto; }
    .big { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-display); font-size: 110px; font-weight: 800; color: var(--lime); line-height: 1; }
    .big i { width: 84px; height: 84px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #f0ff9c, var(--ball) 45%, #9fbf1f); animation: bob 1.4s ease-in-out infinite; }
    @keyframes bob { 50% { transform: translateY(-16px); } }
  `],
})
export class NotFoundPage {}
