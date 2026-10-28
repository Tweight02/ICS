import { Component, HostListener, inject, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { SidebarComponent } from './shared/components/sidebar/sidebar';
import { AuthService } from './core/services/auth/auth-service';


@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    SidebarComponent,
    NgClass
  ],

  templateUrl: './app.html',

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

  private compactViewport = this.isCompactViewport();
  collapsed = this.compactViewport;

  @HostListener('window:resize')
  onViewportResize(): void {
    const compactViewport = this.isCompactViewport();
    if (compactViewport === this.compactViewport) return;

    this.compactViewport = compactViewport;
    this.collapsed = compactViewport;
  }

  private isCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 1024;
  }


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
      && !this.router.url.startsWith('/assistant/new-user')
      && !this.router.url.startsWith('/pastor/new-representative');

  }

  get isLoginPage(): boolean {
    return this.router.url.startsWith('/login');
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
