import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/events/events-api';

interface PublicEvent {
  id: number;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  description: string;
  church_name: string | null;
  scope: string[];
  registration_open: boolean;
  banner: string;
}

const BANNERS = [
  'from-green-700 to-green-900',
  'from-emerald-600 to-green-800',
  'from-teal-600 to-emerald-800',
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  readonly events = signal<PublicEvent[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly refreshMessage = signal('');
  private refreshTimer?: ReturnType<typeof setInterval>;
  private loadingRequest = false;
  private readonly refreshOnFocus = (): void => {
    if (!document.hidden) this.loadEvents(false);
  };

  constructor(
    private eventService: EventService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.refreshTimer = this.zone.runOutsideAngular(() => setInterval(() => {
      if (!document.hidden) this.zone.run(() => this.loadEvents(false));
    }, 5000));
    window.addEventListener('focus', this.refreshOnFocus);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    window.removeEventListener('focus', this.refreshOnFocus);
  }

  loadEvents(showLoading = true): void {
    if (this.loadingRequest) return;
    this.loadingRequest = true;
    if (showLoading && this.events().length === 0) this.loading.set(true);
    this.eventService.getPublicEvents().subscribe({
      next: (events) => {
        this.events.set(events.map((event, index) => ({
          ...event,
          banner: BANNERS[index % BANNERS.length],
        })));
        this.errorMessage.set('');
        this.refreshMessage.set('');
        this.loading.set(false);
        this.loadingRequest = false;
      },
      error: (error) => {
        console.error('Failed to load public events', error);
        if (this.events().length === 0) {
          this.errorMessage.set('Events could not be loaded. Please try again.');
        } else {
          this.refreshMessage.set('Could not refresh events. Showing the latest events already loaded.');
        }
        this.loading.set(false);
        this.loadingRequest = false;
      },
    });
  }

  registrationUrl(eventId: number): string {
    return `/participants/registration?event=${eventId}`;
  }

  scopeLabel(event: PublicEvent): string {
    return event.scope.length ? event.scope.join(', ') : event.church_name || 'Location not specified';
  }
}
