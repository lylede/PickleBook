import { Component, input } from '@angular/core';

/** PickleBook logo. Artwork lives in public/brand (source files in /brand at the repo root). */
@Component({
  selector: 'pb-logo',
  standalone: true,
  template: `<img [src]="onDark() ? 'brand/logo-on-dark.svg' : 'brand/logo.svg'" [height]="height()" [style.height.px]="height()" alt="PickleBook" class="d-block w-auto">`,
})
export class Logo {
  onDark = input(false);
  height = input(28);
}
