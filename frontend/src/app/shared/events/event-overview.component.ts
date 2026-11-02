import { Component, Inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { EventService } from '../../core/services/events/events-api';
import { EventOverviewConfig } from './events.config';
import { Button } from '../components/button/button';
import {
  EventStatus,
  ProgramGroup,
  formatDateRange,
  formatTime,
  statusClass,
  statusLabel,
  statusOf,
} from './event.utils';

@Component({
  selector: 'app-event-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, Button],
  templateUrl: './event-overview.component.html',
})
export class EventOverviewComponent implements OnInit {
  @Input({ required: true }) config!: EventOverviewConfig;

  private readonly eventState = signal<any>(null);
  get event(): any { return this.eventState(); }
  set event(value: any) { this.eventState.set(value); }

  private readonly eventIdState = signal(0);
  get eventId(): number { return this.eventIdState(); }
  set eventId(value: number) { this.eventIdState.set(value); }

  private readonly loadingState = signal(true);
  get loading(): boolean { return this.loadingState(); }
  set loading(value: boolean) { this.loadingState.set(value); }

  private readonly errorMsgState = signal('');
  get errorMsg(): string { return this.errorMsgState(); }
  set errorMsg(value: string) { this.errorMsgState.set(value); }

  private readonly groupsState = signal<ProgramGroup[]>([]);
  get groups(): ProgramGroup[] { return this.groupsState(); }
  set groups(value: ProgramGroup[]) { this.groupsState.set(value); }

  private readonly confirmDeleteState = signal(false);
  get confirmDelete(): boolean { return this.confirmDeleteState(); }
  set confirmDelete(value: boolean) { this.confirmDeleteState.set(value); }

  private readonly deletingState = signal(false);
  get deleting(): boolean { return this.deletingState(); }
  set deleting(value: boolean) { this.deletingState.set(value); }

  private readonly deleteErrorState = signal('');
  get deleteError(): string { return this.deleteErrorState(); }
  set deleteError(value: string) { this.deleteErrorState.set(value); }

  private readonly registrationLinkMessageState = signal('');
  get registrationLinkMessage(): string { return this.registrationLinkMessageState(); }
  set registrationLinkMessage(value: string) { this.registrationLinkMessageState.set(value); }

  private readonly registrationLinkState = signal('');
  get registrationLink(): string { return this.registrationLinkState(); }
  set registrationLink(value: string) { this.registrationLinkState.set(value); }

  private readonly registrationLinkLoadingState = signal(false);
  get registrationLinkLoading(): boolean { return this.registrationLinkLoadingState(); }
  set registrationLinkLoading(value: boolean) { this.registrationLinkLoadingState.set(value); }

  readonly statusClass = statusClass;
  readonly statusLabel = statusLabel;

  get canManageEvent(): boolean {
    return this.event?.abilities?.update === true
      && this.event?.abilities?.delete === true
      && this.event?.abilities?.manage_participants === true;
  }

  get canShareRegistrationLink(): boolean {
    return this.event?.abilities?.confirm_participants === true;
  }

  generateRegistrationLink(): void {
    if (this.registrationLinkLoading) return;
    this.registrationLinkLoading = true;
    this.registrationLinkMessage = '';

    this.eventService.getEventRegistrationLink(this.eventId).subscribe({
      next: (attribution) => {
        const url = new URL('/participants/registration', this.document.baseURI);
        url.searchParams.set('event', String(this.eventId));
        url.searchParams.set('church_id', String(attribution.church_id));
        url.searchParams.set('registration_token', attribution.registration_token);
        this.registrationLink = url.toString();
        this.registrationLinkLoading = false;
      },
      error: (error) => {
        console.error('Failed to generate church registration link', error);
        this.registrationLinkMessage = error?.error?.message
          ?? 'Could not generate a registration link for your church.';
        this.registrationLinkLoading = false;
      },
    });
  }

  async copyRegistrationLink(): Promise<void> {
    if (!this.registrationLink) return;
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      this.registrationLinkMessage = 'Clipboard access is unavailable. Select and copy the link above.';
      return;
    }

    try {
      await clipboard.writeText(this.registrationLink);
      this.registrationLinkMessage = 'Registration link copied.';
    } catch (error) {
      console.error('Failed to copy event registration link', error);
      this.registrationLinkMessage = 'Could not copy the link. Select and copy it manually.';
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    if (!Number.isInteger(this.eventId) || this.eventId < 1) {
      this.errorMsg = 'This event link is invalid.';
      this.loading = false;
      return;
    }

    this.eventService.getEventById(this.eventId).pipe(timeout({ first: 8000 })).subscribe({
      next: (res: any) => {
        this.event = res?.data ?? res;
        this.loading = false;
        this.buildGroups();
      },
      error: (err) => {
        console.error('Failed to load the event:', err);
        this.errorMsg = this.eventLoadError(err);
        this.loading = false;
      },
    });
  }

  private eventLoadError(err: any): string {
    if (err?.name === 'TimeoutError') {
      return 'Loading this event timed out. Check your connection and try again.';
    }
    if (err?.status === 401) {
      return 'Your session has expired. Sign in again to view this event.';
    }
    if (err?.status === 403) {
      return 'You do not have permission to view this event.';
    }
    if (err?.status === 404) {
      return 'This event could not be found. It may have been removed.';
    }
    if (err?.status === 0) {
      return 'The event server could not be reached. Check that the server is running and try again.';
    }

    return 'We could not load this event. Please try again.';
  }

  private buildGroups(): void {
    this.groups = (this.event?.programs ?? []).map((item: any) => ({
      name: item.name ?? item.program_name ?? 'Program',
      items: item.selected ?? item.particulars?.map((particular: any) => particular.particular_name) ?? [],
      expanded: true,
    }));
  }

  toggleGroup(g: ProgramGroup): void {
    this.groups = this.groups.map((group) =>
      group === g ? { ...group, expanded: !group.expanded } : group,
    );
  }

  // ---------- Display helpers ----------
  get status(): EventStatus {
    return statusOf(this.event);
  }

  get dateRange(): string {
    return formatDateRange(this.event?.start_date, this.event?.end_date);
  }

  get timeRange(): string {
    const s = formatTime(this.event?.start_time);
    const e = formatTime(this.event?.end_time);
    return s && e ? `${s}–${e}` : s || e;
  }

  get departmentName(): string {
    return this.event?.department?.department_name
      ?? this.event?.department?.name
      ?? this.event?.department_name
      ?? '';
  }

  get periodLabel(): string {
    const e = this.event;
    if (e?.reporting_period) return e.reporting_period;
    return e?.year
      ? `${e.year}${e.quarter ? ' · Q' + String(e.quarter).replace(/^Q/, '') : ''}`
      : '';
  }

  get organizer(): string {
    const u = this.event?.user ?? this.event?.creator;
    const full = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '';
    const organizedBy = this.event?.organized_by;
    const role = typeof organizedBy === 'string' ? organizedBy : organizedBy?.role;
    return role || full || this.config.organizerFallback;
  }

  /** What the event covers: a church, a list of districts or churches, or the whole mission. */
  get coverage(): { title: string; text: string } {
    const e = this.event;
    const names = (list: any): string[] =>
      Array.isArray(list) ? list.map((x: any) => x?.name ?? x?.church_name ?? '').filter(Boolean) : [];

    const districts = names(e?.scope?.districts ?? e?.districts);
    const churches = names(e?.scope?.churches ?? e?.churches);
    if (districts.length) {
      return {
        title: districts.length === 1 ? 'District' : 'Districts',
        text: e?.scope?.all_districts ? 'All District of NELM' : districts.join(', '),
      };
    }
    if (churches.length) {
      return {
        title: churches.length === 1 ? 'Church' : 'Churches',
        text: churches.join(', '),
      };
    }
    if (e?.church_name || e?.church?.name) {
      return { title: 'Church', text: e.church_name ?? e.church.name };
    }
    return { title: 'Coverage', text: 'Mission-wide' };
  }

  get particularCount(): number {
    return this.groups.reduce((total, group) => total + group.items.length, 0);
  }

  get stats(): { total: number; confirmed: number; pending: number } {
    const participants = this.event?.participants;
    if (participants && typeof participants === 'object' && !Array.isArray(participants)) {
      return {
        total: participants.total ?? this.event?.participants_count ?? 0,
        confirmed: participants.confirmed ?? 0,
        pending: participants.pending ?? 0,
      };
    }

    const list = Array.isArray(participants) ? participants : [];
    const is = (p: any, s: string) => String(p?.status ?? '').toLowerCase() === s;
    return {
      total: list.length || this.event?.participants_count || 0,
      confirmed: list.filter((p: any) => is(p, 'confirmed')).length,
      pending: list.filter((p: any) => is(p, 'pending')).length,
    };
  }

  // ---------- Delete (a friendly confirmation instead of a browser popup) ----------
  askDelete(): void {
    this.deleteError = '';
    this.confirmDelete = true;
  }

  cancelDelete(): void {
    this.confirmDelete = false;
  }

  doDelete(): void {
    this.deleting = true;
    this.deleteError = '';
    this.eventService.deleteEvent(this.eventId).subscribe({
      next: () => this.router.navigate([this.config.basePath]),
      error: (err) => {
        console.error('Failed to delete the event:', err);
        this.deleteError = 'The event could not be deleted. Please try again.';
        this.deleting = false;
      },
    });
  }
}
