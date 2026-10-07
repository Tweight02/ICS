import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

import { SidebarComponent } from './shared/components/sidebar/sidebar';
import { AuthService } from './core/services/auth/auth-service';
import { User } from './core/models/user.model';

// ===== TEMPORARY TEST USER =====
// Set USE_TEMP_USER to false when you're done testing.
const USE_TEMP_USER = true;

const TEMP_USER = {
  first_name: 'Juan',
  middle_name: '',
  last_name: 'Dela Cruz',
  extension_name: '',
  role: 'pastor'   // pastor | director | representative | assistant | events
} as User;
// ================================

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  currentUser: User | null = null;
  collapsed = false;

  constructor() {
    this.currentUser = this.resolveUser();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentUser = this.resolveUser();
      });
  }

  // Temp user wins when the flag is on, otherwise use the real login
  private resolveUser(): User | null {
    return USE_TEMP_USER ? TEMP_USER : this.authService.getCurrentUser();
  }

  get isPastorArea(): boolean {
    return this.router.url.startsWith('/pastor');
  }

  get showSidebar(): boolean {
    return !!this.currentUser;
  }
}