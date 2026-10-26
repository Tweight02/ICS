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
import { EventModel, Participant } from '../../core/models/event.model';
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

  private readonly eventState = signal<EventModel | null>(null);
  get event(): EventModel | null { return this.eventState(); }
  set event(value: EventModel | null) { this.eventState.set(value); }

  private readonly participantsState = signal<Participant[]>([]);
  get participants(): Participant[] { return this.participantsState(); }
  set participants(value: Participant[]) { this.participantsState.set(value); }

  private readonly loadingState = signal(true);
  get loading(): boolean { return this.loadingState(); }
  set loading(value: boolean) { this.loadingState.set(value); }

  private readonly errorMsgState = signal('');
  get errorMsg(): string { return this.errorMsgState(); }
  set errorMsg(value: string) { this.errorMsgState.set(value); }

  private readonly participantActionErrorState = signal('');
  get participantActionError(): string { return this.participantActionErrorState(); }
  set participantActionError(value: string) { this.participantActionErrorState.set(value); }

  private readonly updatingParticipantIdsState = signal<number[]>([]);
  get updatingParticipantIds(): number[] { return this.updatingParticipantIdsState(); }
  set updatingParticipantIds(value: number[]) { this.updatingParticipantIdsState.set(value); }

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
      next: (event) => (this.event = event),
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
    return this.event?.department?.name
      ?? this.event?.department?.department_name
      ?? this.event?.department_name
      ?? '';
  }

  get churchName(): string {
    return this.event?.church_name ?? '';
  }

  get linkedPrograms(): NonNullable<EventModel['programs']> {
    return (this.event?.programs ?? []).filter((program) =>
      Array.isArray(program.particulars) && program.particulars.length > 0
    );
  }

  get canConfirmParticipants(): boolean {
    return this.event?.abilities?.confirm_participants === true;
  }

  // ---------- Counts ----------
  private count(status: Participant['status']): number {
    return this.participants.filter((p) => this.norm(p.status) === status).length;
  }

  private norm(s: unknown): string {
    return String(s ?? '').toLowerCase();
  }

  get confirmedCount(): number {
    return this.confirmedTotal || this.count('confirmed');
  }

  get pendingCount(): number {
    return this.pendingTotal || this.count('pending');
  }

  // ---------- Filter + pagination ----------
  get filtered(): Participant[] {
    return this.participants;
  }

  get currentPage(): number {
    const pages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    return Math.min(this.page, pages);
  }

  get paged(): Participant[] {
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

  statusClass(status: Participant['status']): string {
    switch (this.norm(status)) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-800';
      case 'pending':
        return 'bg-amber-50 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  isUpdatingParticipant(participantId: number | undefined): boolean {
    return participantId !== undefined && this.updatingParticipantIds.includes(participantId);
  }

  updateParticipantStatus(participant: Participant, status: 'confirmed' | 'pending'): void {
    const participantId = Number(participant.id);
    if (!Number.isInteger(participantId) || participantId <= 0 || this.isUpdatingParticipant(participantId)) {
      return;
    }

    this.participantActionError = '';
    this.updatingParticipantIds = [...this.updatingParticipantIds, participantId];
    this.eventService.updateParticipantStatus(participantId, status).subscribe({
      next: () => this.loadParticipants(),
      error: (err) => {
        console.error('Failed to update participant confirmation:', err);
        this.participantActionError =
          err?.error?.message ?? 'We could not update this participant. Please try again.';
        this.updatingParticipantIds = this.updatingParticipantIds.filter((id) => id !== participantId);
      },
      complete: () => {
        this.updatingParticipantIds = this.updatingParticipantIds.filter((id) => id !== participantId);
      },
    });
  }
}
