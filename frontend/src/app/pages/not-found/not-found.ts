import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pb-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container page text-center" style="max-width: 480px; padding-top: 4rem">
      <i class="bi bi-signpost-split display-5 text-secondary"></i>
      <h1 class="h3 mt-3">Page not found</h1>
      <p class="text-secondary">The link may be broken, or the page may have moved.</p>
      <a routerLink="/" class="btn btn-primary">Go to home</a>
    </div>
  `,
})
export class NotFoundPage {}
