import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../core/services/events/events-api';
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
import { PageShellComponent } from './page-shell.component';
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
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent, PaginationComponent],
  templateUrl: './events-home.component.html',
})
export class EventsHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) config!: EventsHomeConfig;
  @ViewChild('listArea') listArea?: ElementRef<HTMLElement>;

  searchTerm = '';
  selectedMonth = 'all';
  selectedStatus: 'all' | EventStatus = 'Upcoming';
  selectedDay: Date | null = null; // set by clicking a green day in the calendar
  page = 1;
  pageSize = 4; // adjusted automatically to the space available

  events: any[] = []; // any[]: API field names (id vs event_id, department_name...) may vary
  loading = true;
  errorMsg = '';

  workspaceName = '';

  calendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
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
    const userId = Number(localStorage.getItem('user_id')) || 1;
    this.eventService.getAuthenticatedUser(userId).subscribe({
      next: (res: any) => {
        const user = res?.data ?? res;
        const name = user?.church_name || user?.church?.name;
        if (name) this.workspaceName = name;
      },
      error: (err) => console.warn('Could not load the user, using defaults', err),
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
    this.selectedMonth = this.calendarLabel;

    // Nothing upcoming or ongoing: show everything instead of an empty list.
    if (!this.events.some((e) => statusOf(e) !== 'Past')) this.selectedStatus = 'all';
  }

  get hasSampleEvents(): boolean {
    return this.events.some((e) => e.isSample);
  }

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
    map.set(this.calendarLabel, this.calendarDate.getTime());
    return map;
  }

  get monthOptions(): string[] {
    return [...this.monthTimes().entries()].sort((a, b) => a[1] - b[1]).map(([label]) => label);
  }

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

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || !!this.selectedDay;
  }

  get heading(): string {
    return this.selectedStatus === 'all' ? 'All events' : `${statusLabel(this.selectedStatus)} events`;
  }

  get filteredEvents(): any[] {
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
  }

  departmentName(e: any): string {
    return e.department?.department_name ?? e.department_name ?? '';
  }

  // ---------- Pagination ----------
  get currentPage(): number {
    const pages = Math.max(1, Math.ceil(this.filteredEvents.length / this.pageSize));
    return Math.min(this.page, pages);
  }

  get pagedEvents(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEvents.slice(start, start + this.pageSize);
  }

  // ---------- Calendar ----------
  get calendarLabel(): string {
    return this.calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  get showingCurrentMonth(): boolean {
    return (
      this.calendarDate.getFullYear() === this.today.getFullYear() &&
      this.calendarDate.getMonth() === this.today.getMonth()
    );
  }

  prevMonth(): void {
    this.goToMonth(-1);
  }

  nextMonth(): void {
    this.goToMonth(1);
  }

  goToday(): void {
    this.calendarDate = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.selectedMonth = this.calendarLabel;
    this.selectedDay = null;
    this.page = 1;
  }

  private goToMonth(delta: number): void {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + delta, 1);
    this.selectedMonth = this.calendarLabel;
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

  get calendarCells(): CalendarCell[] {
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
  }

  /** Number of events overlapping the month shown in the calendar. */
  get calendarMonthCount(): number {
    const first = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth(), 1);
    const last = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 0);
    return this.events.filter((e) => {
      const s = toDate(e.start_date);
      const en = toDate(e.end_date) ?? s;
      return !!s && !!en && s <= last && en >= first;
    }).length;
  }
}
