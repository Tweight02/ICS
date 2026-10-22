import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EventService } from '../../core/services/events/events-api';
import { API_URL, EventFormConfig } from './events.config';
import { PageShellComponent } from './page-shell.component';

interface Particular {
  particular_id: number;
  program_id: number;
  particular_name: string;
}

interface ProgramNode {
  program_id: number;
  department_id: number;
  program_name: string;
  parent_id: number | null;
  particulars: Particular[];
  expanded?: boolean;
}

/** A district or a church that can be ticked. */
interface Option {
  id: number;
  name: string;
  sub?: string;
  selected: boolean;
}

// Used only if GET /districts is not available.
const FALLBACK_DISTRICTS = [
  'Batanes', 'Northwestern Cagayan (NWC)', 'North Central Cagayan (NCG)', 'West Central Cagayan',
  'Eastern Cagayan', 'East Central Cagayan', 'Northeastern Cagayan 1', 'Northeastern Cagayan 2',
  'Southern Cagayan', 'Metro Tuguegarao', 'Mallig', 'Northwestern Isabela', 'Metro Ilagan',
  'Northern Isabela 1', 'Northern Isabela 2', 'Northeastern Isabela', 'West Central Isabela',
  'Western Isabela', 'North Central Isabela', 'South Central Isabela', 'Southeastern Isabela',
  'Southern Isabela', 'Quirino West', 'Quirino East', 'Northern Nueva Vizcaya',
  'Southwestern Nueva Vizcaya', 'Southeastern Nueva Vizcaya',
  'Southeastern Nueva Vizcaya (Grupo Adicional)', 'Central Nueva Vizcaya',
];

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent],
  templateUrl: './event-form.component.html',
})
export class EventFormComponent implements OnInit {
  @Input({ required: true }) config!: EventFormConfig;

  step: 1 | 2 = 1;
  isEdit = false;
  eventId = 0;

  loadingExisting = false;
  loadError = '';
  saving = false;
  saveError = '';
  tried1 = false; // the person pressed Next
  tried2 = false; // the person pressed Create / Update
  touched: Record<string, boolean> = {};

  // ----- Step 1 -----
  readonly currentYear = new Date().getFullYear();
  years = [this.currentYear - 1, this.currentYear, this.currentYear + 1];
  year = this.currentYear; // chosen from a list, never typed
  quarter = 'Q' + (Math.floor(new Date().getMonth() / 3) + 1);
  readonly quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  departments: { department_id: number; department_name: string }[] = [];
  deptId: number | null = null;
  programs: ProgramNode[] = [];
  loadingPrograms = false;
  programsError = '';
  selectedIds: number[] = [];

  // ----- Step 2 -----
  form = { title: '', location: '', start_date: '', end_date: '', start_time: '', end_time: '', notes: '' };
  summaryOpen = false;

  userId: number | null = null;
  userChurchId: number | null = null;
  userChurchName = '';

  districts: Option[] = [];
  districtsOpen = true;
  districtSearch = '';
  allDistricts = false;

  churches: Option[] = [];
  loadingChurches = false;
  churchesError = '';

  // Existing event (edit mode) waiting for the lists it depends on
  private existing: any = null;
  private basicApplied = false;
  private deptApplied = false;
  private pendingChurchIds: number[] | null = null;
  private pendingDistrictIds: number[] | null = null;
  private pendingAllDistricts = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private eventService: EventService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!idParam;
    this.eventId = Number(idParam);
    this.summaryOpen = this.config.coverage === 'church';

    this.loadDepartments();
    this.loadUser();
    if (this.config.coverage === 'districts') this.loadDistricts();

    if (this.isEdit) {
      this.step = 2; // editing starts on the details; "Change department" goes back to step 1
      this.loadExisting();
    }
  }

  // =====================================================================
  // Loading
  // =====================================================================
  private loadDepartments(): void {
    this.http.get<any>(`${API_URL}/departments`).subscribe({
      next: (res) => {
        this.departments = res?.data ?? [];
        this.applyExisting();
      },
      error: (err) => console.error('Failed to load departments', err),
    });
  }

  private loadUser(): void {
    const id = Number(localStorage.getItem('user_id')) || 1;
    this.userId = id;
    this.eventService.getAuthenticatedUser(id).subscribe({
      next: (res: any) => {
        const u = res?.data ?? res;
        if (u) {
          this.userId = u.user_id ?? id;
          this.userChurchId = u.church_id ?? u.church?.church_id ?? null;
          this.userChurchName = u.church_name || u.church?.name || '';
        }
        if (this.config.coverage === 'churches') this.loadChurches();
      },
      error: (err) => {
        console.warn('User load failed, continuing', err);
        if (this.config.coverage === 'churches') this.loadChurches();
      },
    });
  }

  loadPrograms(departmentId: number): void {
    this.loadingPrograms = true;
    this.programsError = '';
    this.http.get<any>(`${API_URL}/departments/${departmentId}/programs`).subscribe({
      next: (res) => {
        const list: ProgramNode[] = (res?.data ?? []).filter((p: ProgramNode) => p.particulars?.length);
        // Open the groups that already have something ticked; otherwise open the first one.
        this.programs = list.map((p, i) => ({
          ...p,
          expanded: this.selectedCountOf(p) > 0 || (i === 0 && this.selectedIds.length === 0),
        }));
        this.loadingPrograms = false;
      },
      error: (err) => {
        console.error('Failed to load programs', err);
        this.programs = [];
        this.programsError = 'We could not load the programs for this department.';
        this.loadingPrograms = false;
      },
    });
  }

  private loadDistricts(): void {
    const fallback = () =>
      FALLBACK_DISTRICTS.map((name, i) => ({ id: i + 1, name, selected: false }));

    this.http.get<any>(`${API_URL}/districts`).subscribe({
      next: (res) => {
        const raw = res?.data ?? res;
        const list: any[] = Array.isArray(raw) ? raw : [];
        this.districts = list.length
          ? list.map((d) => ({ id: d.church_id ?? d.id, name: d.name, selected: false }))
          : fallback();
        this.applyPendingCoverage();
      },
      error: () => {
        this.districts = fallback();
        this.applyPendingCoverage();
      },
    });
  }

  loadChurches(): void {
    this.loadingChurches = true;
    this.churchesError = '';
    const mine = `${API_URL}/pastor/my-district/churches`;
    const first = this.userChurchId ? `${API_URL}/districts/${this.userChurchId}/churches` : mine;

    this.http.get<any>(first).subscribe({
      next: (res) => this.setChurches(res),
      error: () => {
        if (first === mine) return this.failChurches();
        this.http.get<any>(mine).subscribe({
          next: (res) => this.setChurches(res),
          error: () => this.failChurches(),
        });
      },
    });
  }

  private setChurches(res: any): void {
    const raw = res?.data ?? res;
    const list: any[] = Array.isArray(raw) ? raw : (raw?.churches ?? []);
    this.churches = list.map((c) => {
      const id = c.church_id ?? c.id;
      return {
        id,
        name: c.name,
        sub: c.address ?? c.location ?? '',
        selected: !!this.pendingChurchIds && this.pendingChurchIds.includes(id),
      };
    });
    this.loadingChurches = false;
  }

  private failChurches(): void {
    this.churches = [];
    this.churchesError = 'We could not load the churches of your district.';
    this.loadingChurches = false;
  }

  // ---------- Edit mode ----------
  private loadExisting(): void {
    this.loadingExisting = true;
    this.eventService.getEventById(this.eventId).subscribe({
      next: (res: any) => {
        this.existing = res?.data ?? res;
        this.loadingExisting = false;
        this.applyExisting();
      },
      error: (err) => {
        console.error('Failed to load the event', err);
        this.loadError = 'We could not load this event, so it cannot be edited right now.';
        this.loadingExisting = false;
      },
    });
  }

  private applyExisting(): void {
    const e = this.existing;
    if (!e) return;

    if (!this.basicApplied) {
      this.basicApplied = true;
      this.form = {
        title: e.title ?? '',
        location: e.location ?? '',
        start_date: String(e.start_date ?? '').slice(0, 10),
        end_date: String(e.end_date ?? '').slice(0, 10),
        start_time: String(e.start_time ?? '').slice(0, 5),
        end_time: String(e.end_time ?? '').slice(0, 5),
        notes: e.notes ?? '',
      };

      const m = String(e.reporting_period ?? '').match(/(\d{4}).*?(Q[1-4])/);
      this.year = Number(e.year ?? m?.[1] ?? this.year);
      this.quarter = e.quarter ?? m?.[2] ?? this.quarter;
      if (!this.years.includes(this.year)) this.years = [...this.years, this.year].sort();

      this.selectedIds = Array.isArray(e.particular_ids)
        ? e.particular_ids.map(Number)
        : Array.isArray(e.particulars)
          ? e.particulars.map((p: any) => Number(p.particular_id)).filter(Boolean)
          : [];

      const ids = (list: any): number[] | null =>
        Array.isArray(list) ? list.map((x: any) => Number(x?.church_id ?? x?.id ?? x)) : null;
      this.pendingChurchIds = ids(e.church_ids) ?? ids(e.churches);
      this.pendingDistrictIds = ids(e.district_ids) ?? ids(e.districts);
      this.pendingAllDistricts = !!e.all_districts;
      this.applyPendingCoverage();
    }

    if (!this.deptApplied && this.departments.length) {
      this.deptApplied = true;
      const byId = e.department_id ?? e.department?.department_id;
      const byName = e.department_name ?? e.department?.department_name;
      const d =
        this.departments.find((x) => x.department_id === byId) ??
        this.departments.find((x) => x.department_name === byName);
      if (d) {
        this.deptId = d.department_id;
        this.loadPrograms(d.department_id);
      }
    }
  }

  private applyPendingCoverage(): void {
    if (this.districts.length) {
      if (this.pendingAllDistricts) {
        this.allDistricts = true;
        this.districts.forEach((d) => (d.selected = true));
      } else if (this.pendingDistrictIds) {
        const ids = this.pendingDistrictIds;
        this.districts.forEach((d) => (d.selected = ids.includes(d.id)));
        this.allDistricts = this.districts.length > 0 && this.districts.every((d) => d.selected);
      }
    }
    if (this.churches.length && this.pendingChurchIds) {
      const ids = this.pendingChurchIds;
      this.churches.forEach((c) => (c.selected = ids.includes(c.id)));
    }
  }

  // =====================================================================
  // Step 1: department + programs
  // =====================================================================
  get deptName(): string {
    return this.departments.find((d) => d.department_id === this.deptId)?.department_name ?? '';
  }

  selectDepartment(id: number): void {
    if (this.deptId === id) return;
    this.deptId = id;
    this.selectedIds = []; // particulars belong to one department
    this.programs = [];
    this.loadPrograms(id);
  }

  toggleGroup(p: ProgramNode): void {
    p.expanded = !p.expanded;
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggleParticular(id: number): void {
    this.selectedIds = this.isSelected(id)
      ? this.selectedIds.filter((x) => x !== id)
      : [...this.selectedIds, id];
  }

  selectedCountOf(p: ProgramNode): number {
    return (p.particulars ?? []).filter((x) => this.selectedIds.includes(x.particular_id)).length;
  }

  get summaryGroups(): { name: string; items: string[] }[] {
    return this.programs
      .map((p) => ({
        name: p.program_name,
        items: p.particulars.filter((x) => this.isSelected(x.particular_id)).map((x) => x.particular_name),
      }))
      .filter((g) => g.items.length > 0);
  }

  get step1Error(): string {
    if (!this.deptId) return 'Choose one department to continue.';
    if (!this.selectedIds.length) return 'Select at least one particular to continue.';
    return '';
  }

  next(): void {
    this.tried1 = true;
    if (this.step1Error) return;
    this.step = 2;
  }

  changeDepartment(): void {
    this.tried1 = false;
    this.step = 1;
  }

  // =====================================================================
  // Step 2: details + coverage
  // =====================================================================
  touch(field: string): void {
    this.touched[field] = true;
  }

  private rawError(field: string): string {
    const f = this.form;
    switch (field) {
      case 'title':
        return f.title.trim() ? '' : 'Enter an event title.';
      case 'location':
        return f.location.trim() ? '' : 'Enter where the event will take place.';
      case 'start_date':
        return f.start_date ? '' : 'Pick a start date.';
      case 'end_date':
        if (!f.end_date) return 'Pick an end date.';
        return f.start_date && f.end_date < f.start_date ? 'The end date is before the start date.' : '';
      case 'start_time':
        return f.start_time ? '' : 'Pick a start time.';
      case 'end_time':
        if (!f.end_time) return 'Pick an end time.';
        return f.start_date && f.start_date === f.end_date && f.start_time && f.end_time <= f.start_time
          ? 'The end time must be after the start time.'
          : '';
      default:
        return '';
    }
  }

  /** Shown only after the person has touched the field or pressed the main button. */
  fieldError(field: string): string {
    return this.tried2 || this.touched[field] ? this.rawError(field) : '';
  }

  inputClass(field: string): string {
    return this.fieldError(field)
      ? 'border-red-400 focus:ring-red-300'
      : 'border-gray-300 focus:ring-[#1b4d3e]';
  }

  get coverageError(): string {
    if (this.config.coverage === 'districts' && !this.allDistricts && this.selectedDistrictCount === 0) {
      return 'Choose at least one district, or tick All districts.';
    }
    if (this.config.coverage === 'churches' && this.selectedChurchCount === 0) {
      return 'Select at least one church.';
    }
    return '';
  }

  get missingCount(): number {
    const fields = ['title', 'location', 'start_date', 'end_date', 'start_time', 'end_time'];
    return fields.filter((f) => this.rawError(f)).length + (this.coverageError ? 1 : 0);
  }

  // ----- Districts (assistant) -----
  get filteredDistricts(): Option[] {
    const q = this.districtSearch.trim().toLowerCase();
    return q ? this.districts.filter((d) => d.name.toLowerCase().includes(q)) : this.districts;
  }

  get selectedDistrictCount(): number {
    return this.districts.filter((d) => d.selected).length;
  }

  get districtSummary(): string {
    if (this.allDistricts) return `All ${this.districts.length} districts`;
    const names = this.districts.filter((d) => d.selected).map((d) => d.name);
    return names.length ? names.join(', ') : 'No district selected yet';
  }

  /** "All districts" replaces every individual choice. */
  toggleAllDistricts(): void {
    this.allDistricts = !this.allDistricts;
    this.districts.forEach((d) => (d.selected = this.allDistricts));
  }

  toggleDistrict(d: Option): void {
    d.selected = !d.selected;
    this.allDistricts = this.districts.length > 0 && this.districts.every((x) => x.selected);
  }

  // ----- Churches (district pastor) -----
  get selectedChurchCount(): number {
    return this.churches.filter((c) => c.selected).length;
  }

  toggleChurch(c: Option): void {
    c.selected = !c.selected;
  }

  // =====================================================================
  // Header, footer text
  // =====================================================================
  get eyebrow(): string {
    return `MY EVENTS / ${this.isEdit ? 'EDIT EVENT' : 'CREATE EVENT'}`;
  }

  get title(): string {
    if (this.step === 1) return this.isEdit ? 'Change Department & Programs' : 'Department & Program Selection';
    return this.isEdit ? 'Edit Event Details' : 'Event Details';
  }

  get subtitle(): string {
    if (this.step === 1) {
      return this.isEdit
        ? 'Pick a different department or adjust the particulars. Your event details stay saved.'
        : 'Choose a reporting period, department, and the particulars for this event.';
    }
    if (this.isEdit) return 'Update this event or return to step 1 to change its department and programs.';
    return this.config.subtitleCreate.replace('{name}', this.userChurchName || 'your district');
  }

  get step1Caption(): string {
    if (this.step === 1) return 'Current step';
    return this.isEdit ? 'Saved selections' : 'Completed';
  }

  get cancelLink(): any[] {
    return this.isEdit ? [this.config.basePath, this.eventId] : [this.config.basePath];
  }

  get hint(): string {
    if (this.saveError) return this.saveError;
    if (this.step === 1) return this.tried1 && this.step1Error ? this.step1Error : '';
    if (this.tried2 && this.missingCount > 0) {
      const n = this.missingCount;
      return `${n} required field${n === 1 ? '' : 's'} still need${n === 1 ? 's' : ''} your attention.`;
    }
    return this.isEdit ? 'Existing values are preserved until you save.' : '';
  }

  get hintIsError(): boolean {
    if (this.saveError) return true;
    return this.step === 1 ? this.tried1 && !!this.step1Error : this.tried2 && this.missingCount > 0;
  }

  // =====================================================================
  // Save
  // =====================================================================
  private buildPayload(): any {
    const payload: any = {
      ...this.form,
      year: this.year,
      quarter: this.quarter,
      department_id: this.deptId,
      particular_ids: this.selectedIds,
      user_id: this.userId,
    };

    switch (this.config.coverage) {
      case 'church':
        payload.church_id = this.userChurchId;
        break;
      case 'districts':
        payload.all_districts = this.allDistricts;
        payload.district_ids = this.districts.filter((d) => d.selected).map((d) => d.id);
        break;
      case 'churches':
        payload.church_ids = this.churches.filter((c) => c.selected).map((c) => c.id);
        break;
    }
    return payload;
  }

  submit(): void {
    this.tried2 = true;
    this.saveError = '';
    if (this.missingCount > 0) return;

    this.saving = true;
    const payload = this.buildPayload();
    const request = this.isEdit
      ? this.http.put<any>(`${API_URL}/events/${this.eventId}`, payload)
      : this.http.post<any>(`${API_URL}/events`, payload);

    request.subscribe({
      next: (res) => {
        this.saving = false;
        const newId = res?.data?.event_id ?? res?.data?.id ?? res?.event_id ?? res?.id;
        const target = this.isEdit ? this.eventId : newId;
        this.router.navigate(target ? [this.config.basePath, target] : [this.config.basePath]);
      },
      error: (err) => {
        console.error('Failed to save the event', err);
        this.saving = false;
        this.saveError = 'We could not save the event. Your answers are still here, so you can try again.';
      },
    });
  }
}
