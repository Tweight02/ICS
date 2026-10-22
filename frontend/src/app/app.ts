import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { SidebarComponent } from './shared/components/sidebar/sidebar';
import { AuthService } from './core/services/auth/auth-service';


@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    SidebarComponent
  ],

  templateUrl: './app.html',

  styleUrl: './app.css'
})
export class App implements OnInit{
  
  private readonly router = inject(Router);
  
  private readonly auth = inject(AuthService);
  
  ngOnInit(): void {
    console.log(this.currentUser())
  }
 
  /*
  |--------------------------------------------------------------------------
  | CURRENT USER (signal from AuthService, set on login, cleared on logout)
  |--------------------------------------------------------------------------
  */

  readonly currentUser = this.auth.currentUser;


  /*
  |--------------------------------------------------------------------------
  | SIDEBAR COLLAPSED
  |--------------------------------------------------------------------------
  */

  collapsed = false;


  /*
  |--------------------------------------------------------------------------
  | SHOW SIDEBAR
  |--------------------------------------------------------------------------
  |
  | Only when someone is logged in. Reads the AuthService signal, so it
  | updates right after login/logout without a page reload.
  |
  */

  get showSidebar(): boolean {

    return !!this.currentUser()
      && !this.router.url.startsWith('/login')
      && !this.router.url.startsWith('/assistant/new-user');

  }


  /*
  |--------------------------------------------------------------------------
  | CHECK IF PASTOR AREA
  |--------------------------------------------------------------------------
  */

  get isPastorArea(): boolean {

    return this.router.url
      .startsWith('/pastor');

  }

    get isRepresentativeArea(): boolean {

    return this.router.url
      .startsWith('/representative');

  }
}
