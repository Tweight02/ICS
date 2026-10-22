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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/events/events-api';
import { ParticipantsConfig } from './events.config';
import { formatDateRange, formatTime, initialsOf } from './event.utils';
import { PageShellComponent } from './page-shell.component';
import { PaginationComponent } from './pagination.component';

const ROW_HEIGHT = 56; // px, fixed so the right number of rows fits

@Component({
  selector: 'app-event-participants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent, PaginationComponent],
  templateUrl: './event-participants.component.html',
})
export class EventParticipantsComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) config!: ParticipantsConfig;
  @ViewChild('rowsArea') rowsArea?: ElementRef<HTMLElement>;

  eventId = 0;
  event: any = null;
  participants: any[] = [];
  loading = true;
  errorMsg = '';

  searchQuery = '';
  statusFilter = 'all';
  page = 1;
  pageSize = 5;

  readonly initials = initialsOf;
  readonly skeletons = [1, 2, 3];
  private observer?: ResizeObserver;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  ngAfterViewInit(): void {
    if (!this.rowsArea || typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() => this.zone.run(() => this.fitPageSize()));
    this.observer.observe(this.rowsArea.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private fitPageSize(): void {
    if (!this.rowsArea) return;
    if (window.innerWidth < 1024) {
      this.pageSize = 6;
      return;
    }
    const fit = Math.floor(this.rowsArea.nativeElement.clientHeight / ROW_HEIGHT);
    this.pageSize = Math.max(1, Math.min(10, fit));
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.eventService.getEventById(this.eventId).subscribe({
      next: (res: any) => (this.event = res?.data ?? res),
      error: (err) => console.error('Failed to load the event:', err),
    });

    this.eventService.getParticipantsByEvent(this.eventId).subscribe({
      next: (res: any) => {
        this.participants = Array.isArray(res) ? res : (res?.data ?? []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load participants:', err);
        this.errorMsg = 'We could not load the participants. Check your connection and try again.';
        this.loading = false;
      },
    });
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
    return this.count('confirmed');
  }

  get pendingCount(): number {
    return this.count('pending');
  }

  // ---------- Filter + pagination ----------
  get filtered(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.participants.filter((p) => {
      const okText = !q || this.norm(p.name).includes(q) || this.norm(p.role).includes(q);
      const okStatus = this.statusFilter === 'all' || this.norm(p.status) === this.statusFilter;
      return okText && okStatus;
    });
  }

  get currentPage(): number {
    const pages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    return Math.min(this.page, pages);
  }

  get paged(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  resetPage(): void {
    this.page = 1;
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
