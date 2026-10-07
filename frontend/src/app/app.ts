import {
  Component,
  inject,
  NgZone
} from '@angular/core';

import {
  Router,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';

import { filter } from 'rxjs';

import { SidebarComponent } from './shared/components/sidebar/sidebar';
import { AuthService } from './core/services/auth/auth-service';
import { User } from './core/models/user.model';

@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    SidebarComponent
  ],

  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  currentUser: User | null = null;

  constructor() {

    this.loadCurrentUser();

    this.router.events
      .pipe(
        filter(
          event => event instanceof NavigationEnd
        )
      )
      .subscribe(() => {

        this.zone.run(() => {

          this.currentUser =
            this.authService.getCurrentUser();

        });

      });
  }

  private loadCurrentUser(): void {

    this.zone.run(() => {

      this.currentUser =
        this.authService.getCurrentUser();

    });

  }

  get isPastorArea(): boolean {
    return this.router.url.startsWith('/pastor');
  }
}