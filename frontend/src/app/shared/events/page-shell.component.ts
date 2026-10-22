import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Crumb } from './events.config';

/**
 * The frame every events page uses: the same top bar, the same spacing and an optional
 * footer bar for the main buttons. On desktop the frame is exactly as tall as the screen,
 * so the page itself never scrolls. On phones it scrolls normally.
 *
 * If your app already has its own header above the page, set once in styles.css:
 *   :root { --shell-offset: 64px; }   (the height of that header)
 */
@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col min-h-[100dvh] lg:min-h-0 lg:h-[calc(100dvh-var(--shell-offset,0px))] lg:overflow-hidden bg-[#F4F6F5] text-gray-800 font-sans">
      <div class="shrink-0 h-[52px] bg-white border-b border-gray-200 px-6 flex items-center text-[13px] text-gray-500">
        <ng-container *ngFor="let c of crumbs; let last = last">
          <a *ngIf="c.link && !last" [routerLink]="c.link" class="text-gray-500 hover:text-[#1b4d3e] no-underline">{{ c.label }}</a>
          <span *ngIf="!c.link || last" [class.text-gray-800]="last">{{ c.label }}</span>
          <span *ngIf="!last" class="mx-1.5">/</span>
        </ng-container>
      </div>

      <div class="flex-1 min-h-0 w-full max-w-[1400px] mx-auto px-6 pt-4 pb-3 flex flex-col gap-3">
        <ng-content></ng-content>
      </div>

      <div *ngIf="footer" class="shrink-0 border-t border-gray-300/70 bg-[#F4F6F5]">
        <div class="max-w-[1400px] mx-auto px-6 py-2.5">
          <ng-content select="[shellFooter]"></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class PageShellComponent {
  @Input() crumbs: Crumb[] = [];
  @Input() footer = false;
}
