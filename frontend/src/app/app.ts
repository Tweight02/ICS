import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser, NgClass } from '@angular/common';
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
export class App implements OnInit, AfterViewInit, OnDestroy {
  
  private readonly router = inject(Router);
  
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private alertObserver?: MutationObserver;
  private readonly alertTimers = new Map<
    HTMLElement,
    ReturnType<typeof setTimeout>
  >();
  private readonly autoHiddenAlerts = new WeakSet<HTMLElement>();
  
  ngOnInit(): void {
    console.log(this.currentUser())
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.document.body) {
      return;
    }

    this.alertObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        const target = mutation.target;
        const element = target.nodeType === Node.ELEMENT_NODE
          ? target as HTMLElement
          : target.parentElement;
        const alert = element?.closest<HTMLElement>('[role="alert"]');

        if (alert) {
          this.scheduleAlertDismissal(alert);
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          const addedElement = node as HTMLElement;
          if (addedElement.matches('[role="alert"]')) {
            this.scheduleAlertDismissal(addedElement);
          }

          addedElement
            .querySelectorAll<HTMLElement>('[role="alert"]')
            .forEach(alertElement => this.scheduleAlertDismissal(alertElement));
        }
      }
    });

    this.alertObserver.observe(this.document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });

    this.document.body
      .querySelectorAll<HTMLElement>('[role="alert"]')
      .forEach(alert => this.scheduleAlertDismissal(alert));
  }

  ngOnDestroy(): void {
    this.alertObserver?.disconnect();
    this.alertTimers.forEach(timer => clearTimeout(timer));
    this.alertTimers.clear();
  }

  private scheduleAlertDismissal(alert: HTMLElement): void {
    const previousTimer = this.alertTimers.get(alert);
    if (previousTimer !== undefined) {
      clearTimeout(previousTimer);
    }

    if (this.autoHiddenAlerts.delete(alert)) {
      alert.hidden = false;
    }

    this.alertTimers.set(alert, setTimeout(() => {
      alert.hidden = true;
      this.autoHiddenAlerts.add(alert);
      this.alertTimers.delete(alert);
    }, 3000));
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

  get isPersonalReportsPage(): boolean {
    const url = this.router.url.split('?')[0];
    return url.startsWith('/pastor/baptism')
      || url.startsWith('/pastor/deathbap')
      || url.includes('/reports/records/');
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
