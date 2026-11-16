import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from './core/layout.service';
import { Navbar } from './shared/navbar';
import { Tabbar } from './shared/tabbar';
import { Footer } from './shared/footer';
import { Toasts } from './shared/toasts';
import { ConfirmDialog } from './shared/confirm-dialog';

@Component({
  selector: 'pb-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Tabbar, Footer, Toasts, ConfirmDialog],
  template: `
    <a class="visually-hidden-focusable" href="#main">Skip to content</a>
    <pb-navbar />
    <div [class.has-tabbar]="layout.showTabbar()">
      <main id="main"><router-outlet /></main>
      @if (layout.showFooter()) { <pb-footer /> }
    </div>
    @if (layout.showTabbar()) { <pb-tabbar /> }
    <pb-toasts />
    <pb-confirm />
  `,
  styles: [`main { min-height: calc(100svh - 61px); display: block; }`],
})
export class App {
  layout = inject(LayoutService);
}
