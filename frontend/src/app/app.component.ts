import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector:    'snt-root',
  standalone:  true,
  imports:     [RouterOutlet],
  template:    `<router-outlet />`,
  styles:      [`:host { display: block; height: 100vh; overflow: hidden; }`],
})
export class AppComponent {}
