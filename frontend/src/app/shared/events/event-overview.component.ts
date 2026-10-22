import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EventService } from '../../core/services/events/events-api';
import { API_URL, EventOverviewConfig } from './events.config';
import {
  EventStatus,
  ProgramGroup,
  formatDateRange,
  formatTime,
  selectedGroupsOf,
  statusClass,
  statusLabel,
  statusOf,
} from './event.utils';
import { PageShellComponent } from './page-shell.component';

@Component({
  selector: 'app-event-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, PageShellComponent],
  templateUrl: './event-overview.component.html',
})
export class EventOverviewComponent implements OnInit {
  @Input({ required: true }) config!: EventOverviewConfig;

  event: any = null;
  eventId = 0;
  loading = true;
  errorMsg = '';

  groups: ProgramGroup[] = [];
  participants: any[] = [];

  confirmDelete = false;
  deleting = false;
  deleteError = '';

  readonly statusClass = statusClass;
  readonly statusLabel = statusLabel;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.eventService.getEventById(this.eventId).subscribe({
      next: (res: any) => {
        this.event = res?.data ?? res;
        this.loading = false;
        this.buildGroups();
        this.loadParticipants();
      },
      error: (err) => {
        console.error('Failed to load the event:', err);
        this.errorMsg = 'We could not load this event. It may have been removed, or the server is not answering.';
        this.loading = false;
      },
    });
  }

  private loadParticipants(): void {
    this.eventService.getParticipantsByEvent(this.eventId).subscribe({
      next: (res: any) => (this.participants = Array.isArray(res) ? res : (res?.data ?? [])),
      error: () => {
        /* fall back to event.participants */
      },
    });
  }

  /** Selected groups first; the department's other groups are added collapsed with "0 selected". */
  private buildGroups(): void {
    const selected = selectedGroupsOf(this.event);
    this.groups = selected;

    const deptId = this.event?.department_id ?? this.event?.department?.department_id;
    if (!deptId) return;

    this.http.get<any>(`${API_URL}/departments/${deptId}/programs`).subscribe({
      next: (res) => {
        const all: any[] = (res?.data ?? []).filter((p: any) => p.particulars?.length);
        const byName = new Map(selected.map((g) => [g.name, g]));
        const merged: ProgramGroup[] = all.map(
          (p) => byName.get(p.program_name) ?? { name: p.program_name, items: [], expanded: false },
        );
        selected.forEach((g) => {
          if (!merged.includes(g)) merged.push(g);
        });
        this.groups = merged;
      },
      error: () => {
        /* keep the selected-only groups */
      },
    });
  }

  toggleGroup(g: ProgramGroup): void {
    g.expanded = !g.expanded;
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
    return this.event?.department?.department_name ?? this.event?.department_name ?? '';
  }

  get periodLabel(): string {
    const e = this.event;
    if (e?.reporting_period) return e.reporting_period;
    return e?.year ? `${e.year}${e.quarter ? ' · ' + e.quarter : ''}` : '';
  }

  get organizer(): string {
    const u = this.event?.user ?? this.event?.creator;
    const full = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '';
    return this.event?.organized_by || full || this.config.organizerFallback;
  }

  /** What the event covers: a church, a list of districts or churches, or the whole mission. */
  get coverage(): { title: string; text: string } {
    const e = this.event;
    const names = (list: any): string[] =>
      Array.isArray(list) ? list.map((x: any) => x?.name ?? x?.church_name ?? '').filter(Boolean) : [];

    if (e?.church_name || e?.church?.name) return { title: 'Church', text: e.church_name ?? e.church.name };
    if (e?.all_districts) return { title: 'Coverage', text: 'All districts' };

    const list = names(e?.districts).length ? names(e.districts) : names(e?.churches);
    if (list.length) {
      const shown = list.slice(0, 2).join(', ');
      return { title: 'Coverage', text: list.length > 2 ? `${shown} +${list.length - 2} more` : shown };
    }
    return { title: 'Coverage', text: 'Mission-wide' };
  }

  get selectedGroupCount(): number {
    return this.groups.filter((g) => g.items.length > 0).length;
  }

  get particularCount(): number {
    return this.groups.reduce((sum, g) => sum + g.items.length, 0);
  }

  get stats(): { total: number; confirmed: number; pending: number } {
    const list = this.participants.length
      ? this.participants
      : Array.isArray(this.event?.participants)
        ? this.event.participants
        : [];
    const is = (p: any, s: string) => String(p?.status ?? '').toLowerCase() === s;
    return {
      total: list.length || (this.event?.participants_count ?? 0),
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
