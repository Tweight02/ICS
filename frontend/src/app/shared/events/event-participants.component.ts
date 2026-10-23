import {
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/events/events-api';
import { ParticipantsConfig } from './events.config';
import { formatDateRange, formatTime, initialsOf } from './event.utils';
import { PaginationComponent } from './pagination.component';

@Component({
  selector: 'app-event-participants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './event-participants.component.html',
})
export class EventParticipantsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) config!: ParticipantsConfig;

  private readonly eventIdState = signal(0);
  get eventId(): number { return this.eventIdState(); }
  set eventId(value: number) { this.eventIdState.set(value); }

  private readonly eventState = signal<any>(null);
  get event(): any { return this.eventState(); }
  set event(value: any) { this.eventState.set(value); }

  private readonly participantsState = signal<any[]>([]);
  get participants(): any[] { return this.participantsState(); }
  set participants(value: any[]) { this.participantsState.set(value); }

  private readonly loadingState = signal(true);
  get loading(): boolean { return this.loadingState(); }
  set loading(value: boolean) { this.loadingState.set(value); }

  private readonly errorMsgState = signal('');
  get errorMsg(): string { return this.errorMsgState(); }
  set errorMsg(value: string) { this.errorMsgState.set(value); }

  private readonly searchQueryState = signal('');
  get searchQuery(): string { return this.searchQueryState(); }
  set searchQuery(value: string) { this.searchQueryState.set(value); }

  private readonly statusFilterState = signal('all');
  get statusFilter(): string { return this.statusFilterState(); }
  set statusFilter(value: string) { this.statusFilterState.set(value); }

  private readonly pageState = signal(1);
  get page(): number { return this.pageState(); }
  set page(value: number) { this.pageState.set(value); }

  readonly pageSize = 10;
  private readonly totalCountState = signal(0);
  get totalCount(): number { return this.totalCountState(); }
  set totalCount(value: number) { this.totalCountState.set(value); }
  private readonly confirmedCountState = signal(0);
  get confirmedTotal(): number { return this.confirmedCountState(); }
  set confirmedTotal(value: number) { this.confirmedCountState.set(value); }
  private readonly pendingCountState = signal(0);
  get pendingTotal(): number { return this.pendingCountState(); }
  set pendingTotal(value: number) { this.pendingCountState.set(value); }

  readonly initials = initialsOf;
  readonly skeletons = [1, 2, 3];
  private refreshTimer?: ReturnType<typeof setInterval>;
  private participantsRequestInFlight = false;
  private participantsReloadPending = false;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.refreshTimer = this.zone.runOutsideAngular(() => setInterval(() => {
      if (!document.hidden) this.zone.run(() => this.loadParticipants());
    }, 5000));
    window.addEventListener('focus', this.refreshParticipantsOnFocus);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    window.removeEventListener('focus', this.refreshParticipantsOnFocus);
  }

  private readonly refreshParticipantsOnFocus = (): void => {
    if (!document.hidden) this.zone.run(() => this.loadParticipants());
  };

  load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.eventService.getEventById(this.eventId).subscribe({
      next: (res: any) => (this.event = res?.data ?? res),
      error: (err) => console.error('Failed to load the event:', err),
    });

    this.loadParticipants();
  }

  private loadParticipants(): void {
    if (this.participantsRequestInFlight) {
      this.participantsReloadPending = true;
      return;
    }
    this.participantsRequestInFlight = true;

    this.eventService.getParticipantsPage(
      this.eventId,
      this.page,
      this.searchQuery,
      this.statusFilter,
    ).subscribe({
      next: (res) => {
        this.participants = res.data ?? [];
        this.totalCount = res.meta?.total ?? 0;
        this.confirmedTotal = res.summary?.confirmed ?? 0;
        this.pendingTotal = res.summary?.pending ?? 0;
        this.errorMsg = '';
        this.loading = false;
        this.participantsRequestInFlight = false;
        if (this.page > Math.max(1, res.meta?.last_page ?? 1)) {
          this.page = Math.max(1, res.meta?.last_page ?? 1);
          this.participantsReloadPending = true;
        }
        this.reloadIfPending();
      },
      error: (err) => {
        console.error('Failed to load participants:', err);
        this.errorMsg = 'We could not load the participants. Check your connection and try again.';
        this.loading = false;
        this.participantsRequestInFlight = false;
        this.reloadIfPending();
      },
    });
  }

  private reloadIfPending(): void {
    if (!this.participantsReloadPending) return;
    this.participantsReloadPending = false;
    this.loadParticipants();
  }

  // ---------- Event summary ----------
  get dateRange(): string {
    return formatDateRange(this.event?.start_date, this.event?.end_date);
  }

  get timeRange(): string {
    const s = formatTime(this.event?.start_time);
    const e = formatTime(this.event?.end_time);
    return s && e ? `${s}–${e}` : s || e;
  }

  get departmentName(): string {
    return this.event?.department?.department_name ?? this.event?.department_name ?? '';
  }

  get churchName(): string {
    return this.event?.church?.name ?? this.event?.church_name ?? '';
  }

  // ---------- Counts ----------
  private count(status: string): number {
    return this.participants.filter((p) => this.norm(p.status) === status).length;
  }

  private norm(s: any): string {
    return String(s ?? '').toLowerCase();
  }

  get confirmedCount(): number {
    return this.confirmedTotal || this.count('confirmed');
  }

  get pendingCount(): number {
    return this.pendingTotal || this.count('pending');
  }

  // ---------- Filter + pagination ----------
  get filtered(): any[] {
    return this.participants;
  }

  get currentPage(): number {
    const pages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    return Math.min(this.page, pages);
  }

  get paged(): any[] {
    return this.participants;
  }

  resetPage(): void {
    this.page = 1;
    this.loadParticipants();
  }

  changePage(page: number): void {
    this.page = page;
    this.loadParticipants();
  }

  statusClass(status: any): string {
    switch (this.norm(status)) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-800';
      case 'pending':
        return 'bg-amber-50 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }
}
