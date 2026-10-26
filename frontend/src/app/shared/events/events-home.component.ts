import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../core/services/events/events-api';
import { AuthService } from '../../core/services/auth/auth-service';
import { EventsHomeConfig } from './events.config';
import {
  EventStatus,
  eventIdOf,
  formatDateRange,
  formatTime,
  statusClass,
  statusLabel,
  statusOf,
  toDate,
} from './event.utils';
import { PaginationComponent } from './pagination.component';

interface CalendarCell {
  day: number | null;
  date: Date | null;
  today: boolean;
  hasEvent: boolean;
  selected: boolean;
  tooltip: string;
}

const CARD_HEIGHT = 84; // px, fixed so we can fit exactly the right number of cards
const CARD_GAP = 8;

@Component({
  selector: 'app-events-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './events-home.component.html',
  styleUrl: './events-home.component.css',
})
export class EventsHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) config!: EventsHomeConfig;
  @ViewChild('listArea') listArea?: ElementRef<HTMLElement>;

  private readonly searchTermState = signal('');
  get searchTerm(): string { return this.searchTermState(); }
  set searchTerm(value: string) { this.searchTermState.set(value); }

  private readonly selectedMonthState = signal('all');
  get selectedMonth(): string { return this.selectedMonthState(); }
  set selectedMonth(value: string) { this.selectedMonthState.set(value); }

  private readonly selectedStatusState = signal<'all' | EventStatus>('all');
  get selectedStatus(): 'all' | EventStatus { return this.selectedStatusState(); }
  set selectedStatus(value: 'all' | EventStatus) { this.selectedStatusState.set(value); }

  private readonly selectedDayState = signal<Date | null>(null);
  get selectedDay(): Date | null { return this.selectedDayState(); }
  set selectedDay(value: Date | null) { this.selectedDayState.set(value); }

  private readonly pageState = signal(1);
  get page(): number { return this.pageState(); }
  set page(value: number) { this.pageState.set(value); }

  private readonly pageSizeState = signal(4);
  get pageSize(): number { return this.pageSizeState(); }
  set pageSize(value: number) { this.pageSizeState.set(value); }

  private readonly eventsState = signal<any[]>([]);
  get events(): any[] { return this.eventsState(); }
  set events(value: any[]) { this.eventsState.set(value); }

  private readonly loadingState = signal(true);
  get loading(): boolean { return this.loadingState(); }
  set loading(value: boolean) { this.loadingState.set(value); }

  private readonly errorMsgState = signal('');
  get errorMsg(): string { return this.errorMsgState(); }
  set errorMsg(value: string) { this.errorMsgState.set(value); }

  private readonly workspaceNameState = signal('');
  get workspaceName(): string { return this.workspaceNameState(); }
  set workspaceName(value: string) { this.workspaceNameState.set(value); }

  private readonly calendarDateState = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  get calendarDate(): Date { return this.calendarDateState(); }
  set calendarDate(value: Date) { this.calendarDateState.set(value); }
  readonly weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  readonly today = new Date();

  // helpers used by the template
  readonly eventId = eventIdOf;
  readonly statusOf = statusOf;
  readonly statusLabel = statusLabel;
  readonly statusClass = statusClass;
  readonly dateRange = formatDateRange;
  readonly timeOf = formatTime;
  readonly skeletons = [1, 2, 3];

  private observer?: ResizeObserver;

  constructor(
    private eventService: EventService,
    private auth: AuthService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.workspaceName = this.config.workspaceTitle;
    if (this.config.workspaceFromUser) this.loadUser();
    this.loadEvents();
  }

  ngAfterViewInit(): void {
    if (!this.listArea || typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() => this.zone.run(() => this.fitPageSize()));
    this.observer.observe(this.listArea.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** On desktop the list fills the screen exactly, so show as many cards as fit and never scroll. */
  private fitPageSize(): void {
    if (!this.listArea) return;
    if (window.innerWidth < 1024) {
      this.pageSize = 5;
      return;
    }
    const h = this.listArea.nativeElement.clientHeight;
    const fit = Math.floor((h + CARD_GAP) / (CARD_HEIGHT + CARD_GAP));
    this.pageSize = Math.max(1, Math.min(8, fit));
  }

  // ---------- Text with the workspace name ----------
  fill(text: string): string {
    return (text ?? '').replace('{name}', this.workspaceName);
  }

  // ---------- Data ----------
  private loadUser(): void {
    const userId = this.auth.getCurrentUser()?.user_id;
    if (!userId) {
      console.error('Could not load the event workspace: no signed-in user is available.');
      return;
    }

    this.eventService.getAuthenticatedUser(userId).subscribe({
      next: (res: any) => {
        const user = res?.data ?? res;
        const name = user?.church_name || user?.church?.name || user?.district?.name;
        if (name) this.workspaceName = name;
      },
      error: (err) => console.error('Could not load the signed-in user for the event workspace.', err),
    });
  }

  loadEvents(): void {
    this.loading = true;
    this.errorMsg = '';
    this.eventService.getEvents().subscribe({
      next: (res: any) => {
        this.events = Array.isArray(res) ? res : (res?.data ?? []);
        this.loading = false;
        this.initView();
      },
      error: (err) => {
        console.error('Error loading events:', err);
        this.errorMsg = 'We could not load the events. Check your connection and try again.';
        this.loading = false;
      },
    });
  }

  /** Open on the month of the next upcoming event (or the latest one). */
  private initView(): void {
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    const dated = this.events
      .filter((e) => toDate(e.start_date))
      .sort((a, b) => toDate(a.start_date)!.getTime() - toDate(b.start_date)!.getTime());

    if (dated.length === 0) return;

    const next =
      dated.find((e) => (toDate(e.end_date) ?? toDate(e.start_date))! >= today0) ??
      dated[dated.length - 1];

    const s = toDate(next.start_date)!;
    this.calendarDate = new Date(s.getFullYear(), s.getMonth(), 1);
    this.selectedMonth = this.calendarLabel();
  }

  readonly hasSampleEvents = computed(() => this.events.some((e) => e.isSample));

  // ---------- Filters ----------
  private monthLabelOf(e: any): string {
    const d = toDate(e.start_date);
    return d ? d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : '';
  }

  private monthTimes(): Map<string, number> {
    const map = new Map<string, number>();
    for (const e of this.events) {
      const d = toDate(e.start_date);
      if (d) map.set(this.monthLabelOf(e), new Date(d.getFullYear(), d.getMonth(), 1).getTime());
    }
    map.set(this.calendarLabel(), this.calendarDate.getTime());
    return map;
  }

  readonly monthOptions = computed(() =>
    [...this.monthTimes().entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label),
  );

  onMonthChange(): void {
    this.page = 1;
    this.selectedDay = null;
    const t = this.monthTimes().get(this.selectedMonth);
    if (this.selectedMonth !== 'all' && t) this.calendarDate = new Date(t);
  }

  resetPage(): void {
    this.page = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDay = null;
    this.selectedStatus = 'all';
    this.selectedMonth = 'all';
    this.page = 1;
  }

  readonly hasActiveFilters = computed(() => !!this.searchTerm.trim() || !!this.selectedDay);

  readonly heading = computed(() =>
    this.selectedStatus === 'all' ? 'All events' : `${statusLabel(this.selectedStatus)} events`,
  );

  readonly filteredEvents = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    return this.events
      .filter((e) => {
        const okSearch = !term || (e.title ?? '').toLowerCase().includes(term);
        const okStatus = this.selectedStatus === 'all' || statusOf(e) === this.selectedStatus;
        const okDay = this.selectedDay
          ? this.coversDay(e, this.selectedDay)
          : this.selectedMonth === 'all' || this.monthLabelOf(e) === this.selectedMonth;
        return okSearch && okStatus && okDay;
      })
      .sort((a, b) => (toDate(a.start_date)?.getTime() ?? 0) - (toDate(b.start_date)?.getTime() ?? 0));
  });

  departmentName(e: any): string {
    return e.department?.department_name ?? e.department_name ?? '';
  }

  // ---------- Pagination ----------
  readonly currentPage = computed(() => {
    const pages = Math.max(1, Math.ceil(this.filteredEvents().length / this.pageSize));
    return Math.min(this.page, pages);
  });

  readonly pagedEvents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEvents().slice(start, start + this.pageSize);
  });

  // ---------- Calendar ----------
  readonly calendarLabel = computed(() =>
    this.calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  );

  readonly showingCurrentMonth = computed(() => {
    return (
      this.calendarDate.getFullYear() === this.today.getFullYear() &&
      this.calendarDate.getMonth() === this.today.getMonth()
    );
  });

  prevMonth(): void {
    this.goToMonth(-1);
  }

  nextMonth(): void {
    this.goToMonth(1);
  }

  goToday(): void {
    this.calendarDate = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.selectedMonth = this.calendarLabel();
    this.selectedDay = null;
    this.page = 1;
  }

  private goToMonth(delta: number): void {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + delta, 1);
    this.selectedMonth = this.calendarLabel();
    this.selectedDay = null;
    this.page = 1;
  }

  private coversDay(e: any, date: Date): boolean {
    const s = toDate(e.start_date);
    const en = toDate(e.end_date) ?? s;
    return !!s && !!en && date >= s && date <= en;
  }

  /** Green days are clickable; clicking again clears the day filter. */
  selectDay(cell: CalendarCell): void {
    if (!cell.date || !cell.hasEvent) return;
    if (this.selectedDay && this.selectedDay.getTime() === cell.date.getTime()) {
      this.selectedDay = null;
      return;
    }
    this.selectedDay = cell.date;
    this.page = 1;
    this.selectedStatus = 'all'; // a green day may belong to a past event
  }

  clearDay(): void {
    this.selectedDay = null;
    this.page = 1;
  }

  readonly calendarCells = computed(() => {
    const y = this.calendarDate.getFullYear();
    const m = this.calendarDate.getMonth();
    const leading = (new Date(y, m, 1).getDay() + 6) % 7; // week starts on Monday
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < leading; i++) {
      cells.push({ day: null, date: null, today: false, hasEvent: false, selected: false, tooltip: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const onDay = this.events.filter((e) => this.coversDay(e, date));
      cells.push({
        day: d,
        date,
        today: date.toDateString() === this.today.toDateString(),
        hasEvent: onDay.length > 0,
        selected: !!this.selectedDay && this.selectedDay.getTime() === date.getTime(),
        tooltip: onDay.map((e) => e.title).join(', '),
      });
    }
    return cells;
  });

  /** Number of events overlapping the month shown in the calendar. */
  readonly calendarMonthCount = computed(() => {
    const first = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth(), 1);
    const last = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 0);
    return this.events.filter((e) => {
      const s = toDate(e.start_date);
      const en = toDate(e.end_date) ?? s;
      return !!s && !!en && s <= last && en >= first;
    }).length;
  });
}
