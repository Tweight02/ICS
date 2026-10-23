import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EventService } from '../../core/services/events/events-api';
import { API_URL, EventFormConfig } from './events.config';

interface ProgramNode {
  program_id: number;
  department_id: number;
  program_name: string;
  parent_id: number | null;
  particulars: Particular[];
}

interface Particular {
  particular_id: number;
  program_id: number;
  particular_name: string;
}

/** A district or a church that can be ticked. */
interface Option {
  id: number;
  name: string;
  sub?: string;
  selected: boolean;
}

interface EventFormValues {
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './event-form.component.html',
})
export class EventFormComponent implements OnInit {
  @Input({ required: true }) config!: EventFormConfig;

  private readonly stepState = signal<1 | 2>(1);
  get step(): 1 | 2 { return this.stepState(); }
  set step(value: 1 | 2) { this.stepState.set(value); }

  private readonly isEditState = signal(false);
  get isEdit(): boolean { return this.isEditState(); }
  set isEdit(value: boolean) { this.isEditState.set(value); }

  private readonly eventIdState = signal(0);
  get eventId(): number { return this.eventIdState(); }
  set eventId(value: number) { this.eventIdState.set(value); }

  private readonly loadingExistingState = signal(false);
  get loadingExisting(): boolean { return this.loadingExistingState(); }
  set loadingExisting(value: boolean) { this.loadingExistingState.set(value); }

  private readonly loadErrorState = signal('');
  get loadError(): string { return this.loadErrorState(); }
  set loadError(value: string) { this.loadErrorState.set(value); }

  private readonly savingState = signal(false);
  get saving(): boolean { return this.savingState(); }
  set saving(value: boolean) { this.savingState.set(value); }

  private readonly saveErrorState = signal('');
  get saveError(): string { return this.saveErrorState(); }
  set saveError(value: string) { this.saveErrorState.set(value); }

  private readonly tried1State = signal(false);
  get tried1(): boolean { return this.tried1State(); }
  set tried1(value: boolean) { this.tried1State.set(value); }

  private readonly tried2State = signal(false);
  get tried2(): boolean { return this.tried2State(); }
  set tried2(value: boolean) { this.tried2State.set(value); }

  private readonly touchedState = signal<Record<string, boolean>>({});
  get touched(): Record<string, boolean> { return this.touchedState(); }
  set touched(value: Record<string, boolean>) { this.touchedState.set(value); }

  // ----- Step 1 -----
  private readonly departmentsState = signal<{ department_id: number; department_name: string }[]>([]);
  get departments(): { department_id: number; department_name: string }[] { return this.departmentsState(); }
  set departments(value: { department_id: number; department_name: string }[]) { this.departmentsState.set(value); }

  private readonly departmentsLoadingState = signal(false);
  get departmentsLoading(): boolean { return this.departmentsLoadingState(); }
  set departmentsLoading(value: boolean) { this.departmentsLoadingState.set(value); }

  private readonly departmentsErrorState = signal('');
  get departmentsError(): string { return this.departmentsErrorState(); }
  set departmentsError(value: string) { this.departmentsErrorState.set(value); }

  private readonly deptIdState = signal<number | null>(null);
  get deptId(): number | null { return this.deptIdState(); }
  set deptId(value: number | null) { this.deptIdState.set(value); }

  private readonly allProgramsState = signal<ProgramNode[]>([]);
  private get allPrograms(): ProgramNode[] { return this.allProgramsState(); }
  private set allPrograms(value: ProgramNode[]) { this.allProgramsState.set(value); }

  private readonly programsState = signal<ProgramNode[]>([]);
  get programs(): ProgramNode[] { return this.programsState(); }
  set programs(value: ProgramNode[]) { this.programsState.set(value); }

  private readonly selectedParticularIdsState = signal<number[]>([]);
  get selectedParticularIds(): number[] { return this.selectedParticularIdsState(); }
  set selectedParticularIds(value: number[]) { this.selectedParticularIdsState.set(value); }

  private readonly loadingProgramsState = signal(false);
  get loadingPrograms(): boolean { return this.loadingProgramsState(); }
  set loadingPrograms(value: boolean) { this.loadingProgramsState.set(value); }

  private readonly programsErrorState = signal('');
  get programsError(): string { return this.programsErrorState(); }
  set programsError(value: string) { this.programsErrorState.set(value); }

  // ----- Step 2 -----
  private readonly formState = signal<EventFormValues>({ title: '', location: '', start_date: '', end_date: '', start_time: '', end_time: '', notes: '' });
  get form(): EventFormValues { return this.formState(); }
  set form(value: EventFormValues) { this.formState.set(value); }
  private readonly summaryOpenState = signal(false);
  get summaryOpen(): boolean { return this.summaryOpenState(); }
  set summaryOpen(value: boolean) { this.summaryOpenState.set(value); }

  private readonly userIdState = signal<number | null>(null);
  get userId(): number | null { return this.userIdState(); }
  set userId(value: number | null) { this.userIdState.set(value); }

  private readonly userChurchIdState = signal<number | null>(null);
  get userChurchId(): number | null { return this.userChurchIdState(); }
  set userChurchId(value: number | null) { this.userChurchIdState.set(value); }

  private readonly userChurchNameState = signal('');
  get userChurchName(): string { return this.userChurchNameState(); }
  set userChurchName(value: string) { this.userChurchNameState.set(value); }

  private readonly districtsState = signal<Option[]>([]);
  get districts(): Option[] { return this.districtsState(); }
  set districts(value: Option[]) { this.districtsState.set(value); }

  private readonly districtsOpenState = signal(true);
  get districtsOpen(): boolean { return this.districtsOpenState(); }
  set districtsOpen(value: boolean) { this.districtsOpenState.set(value); }
  private readonly districtSearchState = signal('');
  get districtSearch(): string { return this.districtSearchState(); }
  set districtSearch(value: string) { this.districtSearchState.set(value); }

  private readonly districtsErrorState = signal('');
  get districtsError(): string { return this.districtsErrorState(); }
  set districtsError(value: string) { this.districtsErrorState.set(value); }

  private readonly churchesState = signal<Option[]>([]);
  get churches(): Option[] { return this.churchesState(); }
  set churches(value: Option[]) { this.churchesState.set(value); }

  private readonly loadingChurchesState = signal(false);
  get loadingChurches(): boolean { return this.loadingChurchesState(); }
  set loadingChurches(value: boolean) { this.loadingChurchesState.set(value); }
  private readonly churchesErrorState = signal('');
  get churchesError(): string { return this.churchesErrorState(); }
  set churchesError(value: string) { this.churchesErrorState.set(value); }

  // Existing event (edit mode) waiting for the lists it depends on
  private existing: any = null;
  private basicApplied = false;
  private deptApplied = false;
  private pendingChurchIds: number[] | null = null;
  private pendingDistrictIds: number[] | null = null;

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
  loadDepartments(): void {
    this.departmentsLoading = true;
    this.departmentsError = '';
    this.eventService.getDepartments().subscribe({
      next: (res) => {
        this.departments = res;
        this.departmentsLoading = false;
        this.applyExisting();
      },
      error: (err) => {
        console.error('Failed to load departments', err);
        this.departments = [];
        this.departmentsLoading = false;
        this.departmentsError = 'We could not load departments. Check your connection and try again.';
      },
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
    this.allPrograms = [];
    this.programs = [];
    this.http.get<any>(`${API_URL}/departments/${departmentId}/programs`).subscribe({
      next: (res) => {
        this.allPrograms = res?.data ?? [];
        this.programs = this.allPrograms.filter(
          (program: ProgramNode) => program.particulars?.length,
        );
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

  loadDistricts(): void {
    this.districtsError = '';
    this.http.get<any>(`${API_URL}/districts`).subscribe({
      next: (res) => {
        const raw = res?.data ?? res;
        const list: any[] = Array.isArray(raw) ? raw : [];
        this.districts = list.map((d) => ({ id: d.church_id ?? d.id, name: d.name, selected: false }));
        this.applyPendingCoverage();
      },
      error: (err) => {
        console.error('Failed to load districts', err);
        this.districts = [];
        this.districtsError = 'We could not load districts. Try again before saving.';
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
        if (this.existing?.abilities?.update !== true) {
          this.loadError = 'You do not have permission to edit this event.';
          return;
        }
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

      this.selectedParticularIds = Array.isArray(e.particular_ids)
        ? e.particular_ids.map(Number)
        : [];

      const ids = (list: any): number[] | null =>
        Array.isArray(list) ? list.map((x: any) => Number(x?.church_id ?? x?.id ?? x)) : null;
      this.pendingChurchIds = ids(e.church_ids) ?? ids(e.scope?.churches) ?? (e.church_id ? [Number(e.church_id)] : null);
      this.pendingDistrictIds = ids(e.district_ids) ?? ids(e.scope?.districts);
      this.applyPendingCoverage();
    }

    if (!this.deptApplied && this.departments.length) {
      this.deptApplied = true;
      const byId = e.department_id ?? e.department?.id ?? e.department?.department_id;
      const byName = e.department_name ?? e.department?.name ?? e.department?.department_name;
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
      if (this.pendingDistrictIds) {
        const ids = this.pendingDistrictIds;
        this.districts = this.districts.map((district) => ({
          ...district,
          selected: ids.includes(district.id),
        }));
      }
    }
    if (this.churches.length && this.pendingChurchIds) {
      const ids = this.pendingChurchIds;
      this.churches = this.churches.map((church) => ({
        ...church,
        selected: ids.includes(church.id),
      }));
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
    this.selectedParticularIds = [];
    this.allPrograms = [];
    this.programs = [];
    this.loadPrograms(id);
  }

  private rootProgramId(programId: number): number | null {
    const byId = new Map(this.allPrograms.map((program) => [program.program_id, program]));
    let program = byId.get(programId);
    const visited = new Set<number>();

    while (program?.parent_id != null) {
      if (visited.has(program.program_id)) return null;
      visited.add(program.program_id);
      program = byId.get(program.parent_id);
    }

    return program?.program_id ?? null;
  }

  isParticularSelected(id: number): boolean {
    return this.selectedParticularIds.includes(id);
  }

  canSelectParticular(particular: Particular): boolean {
    if (this.isParticularSelected(particular.particular_id) || this.selectedParticularIds.length === 0) {
      return true;
    }
    const selected = this.programs
      .flatMap((program) => program.particulars ?? [])
      .find((item) => this.isParticularSelected(item.particular_id));
    const selectedRoot = selected ? this.rootProgramId(selected.program_id) : null;
    const optionRoot = this.rootProgramId(particular.program_id);
    return selectedRoot !== null && selectedRoot === optionRoot;
  }

  toggleParticular(particular: Particular): void {
    if (this.isParticularSelected(particular.particular_id)) {
      this.selectedParticularIds = this.selectedParticularIds.filter((id) => id !== particular.particular_id);
    } else if (this.canSelectParticular(particular)) {
      this.selectedParticularIds = [...this.selectedParticularIds, particular.particular_id];
    }
  }

  get summaryGroups(): { name: string; items: string[] }[] {
    return this.programs.map((program) => ({
      name: program.program_name,
      items: program.particulars
        .filter((particular) => this.isParticularSelected(particular.particular_id))
        .map((particular) => particular.particular_name),
    })).filter((group) => group.items.length > 0);
  }

  get step1Error(): string {
    if (!this.deptId) return 'Choose one department to continue.';
    if (!this.selectedParticularIds.length) return 'Choose at least one particular to continue.';
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
    this.touched = { ...this.touched, [field]: true };
  }

  updateFormField(field: keyof EventFormValues, value: string): void {
    this.form = { ...this.form, [field]: value };
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
    if (this.config.coverage === 'districts' && this.selectedDistrictCount === 0) {
      return 'Choose at least one district.';
    }
    if (this.config.coverage === 'churches' && this.selectedChurchCount === 0) {
      return 'Select one church.';
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

  get allDistrictsSelected(): boolean {
    return this.districts.length > 0 && this.selectedDistrictCount === this.districts.length;
  }

  get districtSummary(): string {
    const names = this.districts.filter((d) => d.selected).map((d) => d.name);
    return names.length ? names.join(', ') : 'No district selected yet';
  }

  toggleAllDistricts(): void {
    const selected = !this.allDistrictsSelected;
    this.districts = this.districts.map((district) => ({ ...district, selected }));
  }

  toggleDistrict(d: Option): void {
    this.districts = this.districts.map((district) => ({
      ...district,
      selected: district.id === d.id ? !district.selected : district.selected,
    }));
  }

  // ----- Churches (district pastor) -----
  get selectedChurchCount(): number {
    return this.churches.filter((c) => c.selected).length;
  }

  toggleChurch(c: Option): void {
    const selected = !c.selected;
    this.churches = this.churches.map((church) => ({
      ...church,
      selected: church.id === c.id && selected,
    }));
  }

  // =====================================================================
  // Header, footer text
  // =====================================================================
  get eyebrow(): string {
    return `MY EVENTS / ${this.isEdit ? 'EDIT EVENT' : 'CREATE EVENT'}`;
  }

  get title(): string {
    if (this.step === 1) return this.isEdit ? 'Change Department & Particulars' : 'Department & Particular Selection';
    return this.isEdit ? 'Edit Event Details' : 'Event Details';
  }

  get subtitle(): string {
    if (this.step === 1) {
      return this.isEdit
        ? 'Pick a different department or particulars. Your event details stay saved.'
        : 'Choose a department and the particulars for this event.';
    }
    if (this.isEdit) return 'Update this event or return to step 1 to change its department and programs.';
    return this.config.subtitleCreate.replace('{name}', this.userChurchName || 'your district');
  }

  get step1Caption(): string {
    if (this.step === 1) return 'Current step';
    return this.isEdit ? 'Saved particulars' : 'Completed';
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
      department_id: this.deptId,
      particular_ids: this.selectedParticularIds,
    };

    switch (this.config.coverage) {
      case 'church':
        payload.church_id = this.userChurchId;
        break;
      case 'districts':
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
        const errors = err?.error?.errors;
        const firstValidationError = errors ? Object.values(errors).flat()[0] : null;
        this.saveError = typeof firstValidationError === 'string'
          ? firstValidationError
          : err?.error?.message ?? 'We could not save the event. Your answers are still here, so you can try again.';
      },
    });
  }
}
