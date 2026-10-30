import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EventService } from '../../core/services/events/events-api';
import { AuthService } from '../../core/services/auth/auth-service';
import { Department } from '../../core/models/event.model';
import { API_URL, EventFormConfig } from './events.config';
import { Button } from '../components/button/button';
import { showAppAlert } from '../utils/app-alert';

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
  imports: [CommonModule, FormsModule, RouterLink, Button],
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
  private readonly deptIdState = signal<number | null>(null);
  get deptId(): number | null { return this.deptIdState(); }
  set deptId(value: number | null) { this.deptIdState.set(value); }

  private readonly departmentNameState = signal('');
  get departmentName(): string { return this.departmentNameState(); }
  set departmentName(value: string) { this.departmentNameState.set(value); }

  private readonly canChooseDepartmentState = signal(false);
  get canChooseDepartment(): boolean { return this.canChooseDepartmentState(); }

  private readonly departmentsState = signal<Department[]>([]);
  get departments(): Department[] { return this.departmentsState(); }
  set departments(value: Department[]) { this.departmentsState.set(value); }

  private readonly loadingDepartmentsState = signal(false);
  get loadingDepartments(): boolean { return this.loadingDepartmentsState(); }
  set loadingDepartments(value: boolean) { this.loadingDepartmentsState.set(value); }

  private readonly departmentErrorState = signal('');
  get departmentError(): string { return this.departmentErrorState(); }
  set departmentError(value: string) { this.departmentErrorState.set(value); }

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

  private readonly userDistrictIdState = signal<number | null>(null);
  get userDistrictId(): number | null { return this.userDistrictIdState(); }
  set userDistrictId(value: number | null) { this.userDistrictIdState.set(value); }

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
  private pendingChurchIds: number[] | null = null;
  private pendingDistrictIds: number[] | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private eventService: EventService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!idParam;
    this.eventId = Number(idParam);
    this.summaryOpen = this.config.coverage === 'church';

    this.loadUser();
    if (this.config.coverage === 'districts') this.loadDistricts();

    if (this.isEdit) {
      this.step = 2; // Editing starts on the details; the particulars action returns to step 1.
      this.loadExisting();
    }
  }

  // =====================================================================
  // Loading
  // =====================================================================
  loadUser(): void {
    this.departmentError = '';
    const id = this.auth.getCurrentUser()?.user_id;
    if (!id) {
      console.error('Could not load the event form: no signed-in user is available.');
      this.departmentError = 'We could not identify your signed-in account. Sign in again and retry.';
      if (this.config.coverage === 'churches') this.failChurches();
      return;
    }

    this.userId = id;
    this.eventService.getAuthenticatedUser(id).subscribe({
      next: (res: any) => {
        const u = res?.data ?? res;
        if (u) {
          this.userId = u.user_id ?? id;
          this.userChurchId = u.church_id ?? u.church?.church_id ?? null;
          const role = String(u.role ?? '').toLowerCase().replace(/[-_]/g, ' ').trim();
          const isRepresentative = role === 'representative' || role === 'church representative';
          const isPastor = role === 'pastor' || role === 'district pastor';
          this.userDistrictId = Number(
            u.district?.id ?? u.district?.church_id ?? u.district_id ?? u.church?.parent_id,
          ) || (isPastor ? this.userChurchId : null);
          this.userChurchName = isPastor
            ? u.district?.name || u.district_name || u.church?.parent?.name || u.church?.name || ''
            : u.church_name || u.church?.name || '';
          this.canChooseDepartmentState.set(isRepresentative || isPastor);
          if (isRepresentative || isPastor) {
            if (!this.isEdit) {
              this.deptId = null;
              this.departmentName = '';
            }
            this.loadDepartments();
          } else {
            const departmentId = Number(u.department_id ?? u.department?.department_id);
            if (Number.isInteger(departmentId) && departmentId > 0) {
              this.deptId = departmentId;
              this.departmentName = u.department?.department_name || `Department ${departmentId}`;
              this.loadPrograms(departmentId);
            } else {
              this.deptId = null;
              this.departmentName = '';
              this.departmentError = 'Your account is not assigned to a department. Contact an administrator before creating events.';
            }
          }
        } else {
          this.departmentError = 'We could not load your account details. Try again.';
        }
        if (this.config.coverage === 'churches') this.loadChurches();
      },
      error: (err) => {
        console.error('Could not load the signed-in user for the event form.', err);
        this.departmentError = 'We could not load your assigned department. Check your connection and try again.';
        if (this.config.coverage === 'churches') this.loadChurches();
      },
    });
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.departmentError = '';
    this.eventService.getEventDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        const selected = departments.find((department) => department.department_id === this.deptId);
        if (selected) this.departmentName = selected.department_name;
        this.loadingDepartments = false;
      },
      error: (err) => {
        console.error('Failed to load departments for the event form.', err);
        this.departments = [];
        this.departmentError = 'We could not load departments. Check your connection and try again.';
        this.loadingDepartments = false;
      },
    });
  }

  selectDepartment(value: string | number): void {
    const departmentId = Number(value);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      this.deptId = null;
      this.departmentName = '';
      this.selectedParticularIds = [];
      this.programs = [];
      this.allPrograms = [];
      return;
    }

    const department = this.departments.find((item) => item.department_id === departmentId);
    if (!department) return;

    if (departmentId !== this.deptId) this.selectedParticularIds = [];
    this.deptId = departmentId;
    this.departmentName = department.department_name;
    this.departmentError = '';
    this.tried1 = false;
    this.loadPrograms(departmentId);
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
    const districtId = this.userDistrictId ?? this.userChurchId;
    const first = districtId ? `${API_URL}/districts/${districtId}/churches` : mine;

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
      if (this.config.coverage === 'church') {
        const departmentId = Number(e.department?.id ?? e.department?.department_id);
        if (Number.isInteger(departmentId) && departmentId > 0) {
          this.deptId = departmentId;
          this.departmentName = e.department?.name ?? e.department?.department_name ?? `Department ${departmentId}`;
          this.loadPrograms(departmentId);
        }
      }

      const ids = (list: any): number[] | null =>
        Array.isArray(list) ? list.map((x: any) => Number(x?.church_id ?? x?.id ?? x)) : null;
      this.pendingChurchIds = ids(e.church_ids) ?? ids(e.scope?.churches) ?? (e.church_id ? [Number(e.church_id)] : null);
      this.pendingDistrictIds = ids(e.district_ids) ?? ids(e.scope?.districts);
      this.applyPendingCoverage();
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
  // Step 1: assigned department + programs
  // =====================================================================
  readonly deptName = computed(() => this.departmentName);

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

  getVisiblePrograms(): ProgramNode[] {
    return this.programs.filter((program) => this.getVisibleParticulars(program).length > 0);
  }

  getVisibleParticulars(program: ProgramNode): Particular[] {
    return (program.particulars ?? []).filter((particular) =>
      this.isParticularSelected(particular.particular_id) ||
      this.isHeadcountParticular(particular) ||
      this.isEventPurposeParticular(particular),
    );
  }

  private isHeadcountParticular(particular: Particular): boolean {
    const name = particular.particular_name.trim().toLowerCase();
    if (/\b(attendance|attending|attendees|participants?|headcount)\b/.test(name)) {
      return true;
    }

    const countSubject = name.match(/\b(?:number|no\.?)\s+of\s+(.+)/)?.[1];
    return !!countSubject && /\b(?:people|persons|children|youth|women|men|members|students|visitors|leaders|workers|souls|baptisms)\b/.test(countSubject);
  }

  isEventPurposeParticular(particular: Particular): boolean {
    return /\b(?:camping|camporee|retreats?|conventions?|festivals?|seminars?|trainings?|fellowships?|meetings?|evangelism|bible studies)\b/i
      .test(particular.particular_name.trim());
  }

  particularCountType(particular: Particular): 'participant' | 'completed event' | null {
    if (this.isHeadcountParticular(particular)) return 'participant';
    if (this.isEventPurposeParticular(particular)) return 'completed event';
    return null;
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

  readonly summaryGroups = computed(() =>
    this.programs.map((program) => ({
      name: program.program_name,
      items: program.particulars
        .filter((particular) => this.isParticularSelected(particular.particular_id))
        .map((particular) => particular.particular_name),
    })).filter((group) => group.items.length > 0),
  );

  readonly step1Error = computed(() => {
    if (!this.deptId) {
      return this.canChooseDepartment
        ? 'Choose a department before continuing.'
        : 'Your account must be assigned to a department before continuing.';
    }
    if (!this.selectedParticularIds.length) return 'Choose at least one particular to continue.';
    return '';
  });

  next(): void {
    this.tried1 = true;
    if (this.step1Error()) return;
    this.step = 2;
  }

  changeParticulars(): void {
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

  updateAnnouncement(value: string, textarea: HTMLTextAreaElement): void {
    this.updateFormField('notes', value);
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
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

  readonly coverageError = computed(() => {
    if (this.config.coverage === 'districts' && this.selectedDistrictCount() === 0) {
      return 'Choose at least one district.';
    }
    if (this.config.coverage === 'churches' && this.selectedChurchCount() === 0) {
      return 'Select at least one church.';
    }
    return '';
  });

  readonly missingCount = computed(() => {
    const fields = ['title', 'location', 'start_date', 'end_date', 'start_time', 'end_time'];
    return fields.filter((f) => this.rawError(f)).length + (this.coverageError() ? 1 : 0);
  });

  // ----- Districts (assistant) -----
  readonly filteredDistricts = computed(() => {
    const q = this.districtSearch.trim().toLowerCase();
    return q ? this.districts.filter((d) => d.name.toLowerCase().includes(q)) : this.districts;
  });

  readonly selectedDistrictCount = computed(() => this.districts.filter((d) => d.selected).length);

  readonly allDistrictsSelected = computed(
    () => this.districts.length > 0 && this.selectedDistrictCount() === this.districts.length,
  );

  readonly districtSummary = computed(() => {
    const names = this.districts.filter((d) => d.selected).map((d) => d.name);
    return names.length ? names.join(', ') : 'No district selected yet';
  });

  toggleAllDistricts(): void {
    const selected = !this.allDistrictsSelected();
    this.districts = this.districts.map((district) => ({ ...district, selected }));
  }

  toggleDistrict(d: Option): void {
    this.districts = this.districts.map((district) => ({
      ...district,
      selected: district.id === d.id ? !district.selected : district.selected,
    }));
  }

  // ----- Churches (district pastor) -----
  readonly selectedChurchCount = computed(() => this.churches.filter((c) => c.selected).length);

  readonly allChurchesSelected = computed(
    () => this.churches.length > 0 && this.selectedChurchCount() === this.churches.length,
  );

  toggleAllChurches(): void {
    if (this.isEdit) return;
    const selected = !this.allChurchesSelected();
    this.churches = this.churches.map((church) => ({ ...church, selected }));
  }

  toggleChurch(c: Option): void {
    this.churches = this.churches.map((church) => {
      if (church.id !== c.id) return church;
      return { ...church, selected: this.isEdit ? true : !church.selected };
    });
  }

  // =====================================================================
  // Header, footer text
  // =====================================================================
  readonly eyebrow = computed(() => `MY EVENTS / ${this.isEdit ? 'EDIT EVENT' : 'CREATE EVENT'}`);

  readonly title = computed(() => {
    if (this.step === 1) return this.isEdit ? 'Change Particulars' : 'Particular Selection';
    return this.isEdit ? 'Edit Event Details' : 'Event Details';
  });

  readonly subtitle = computed(() => {
    if (this.step === 1) {
      if (this.canChooseDepartment && !this.isEdit) {
        return 'Choose a department, then select the particulars for this event.';
      }
      return this.isEdit
        ? 'Update the particulars linked to this event. Its department is fixed.'
        : 'Choose particulars from your assigned department.';
    }
    if (this.isEdit) return 'Update this event or return to step 1 to change its particulars.';
    return this.config.subtitleCreate.replace('{name}', this.userChurchName || 'your district');
  });

  readonly step1Caption = computed(() => {
    if (this.step === 1) return 'Current step';
    return this.isEdit ? 'Saved particulars' : 'Completed';
  });

  readonly cancelLink = computed<any[]>(() => {
    return this.isEdit ? [this.config.basePath, this.eventId] : [this.config.basePath];
  });

  readonly hint = computed(() => {
    if (this.saveError) return this.saveError;
    if (this.step === 1) return this.tried1 && this.step1Error() ? this.step1Error() : '';
    if (this.tried2 && this.missingCount() > 0) {
      const n = this.missingCount();
      return `${n} required field${n === 1 ? '' : 's'} still need${n === 1 ? 's' : ''} your attention.`;
    }
    return this.isEdit ? 'Existing values are preserved until you save.' : '';
  });

  readonly hintIsError = computed(() => {
    if (this.saveError) return true;
    return this.step === 1 ? this.tried1 && !!this.step1Error() : this.tried2 && this.missingCount() > 0;
  });

  // =====================================================================
  // Save
  // =====================================================================
  private buildPayload(): any {
    const payload: any = {
      ...this.form,
      particular_ids: this.selectedParticularIds,
    };

    if (this.canChooseDepartment) {
      payload.department_id = this.deptId;
    }

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
    if (this.saving) return;

    const role = String(this.auth.getCurrentUser()?.role ?? '')
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ');
    if (role === 'head assistant') {
      this.saveError = 'Head Assistants cannot create or edit events.';
      return;
    }

    this.tried2 = true;
    this.saveError = '';
    if (this.missingCount() > 0) return;

    this.saving = true;
    this.saveEvent(this.buildPayload());
  }

  private saveEvent(payload: Record<string, unknown>, confirmedOverlap = false): void {
    const request = this.isEdit
      ? this.http.put<any>(`${API_URL}/events/${this.eventId}`, payload)
      : this.http.post<any>(`${API_URL}/events`, payload);

    request.subscribe({
      next: (res) => {
        this.saving = false;
        const createdEvent = Array.isArray(res?.data) ? res.data[0] : res?.data;
        const newId = createdEvent?.event_id ?? createdEvent?.id ?? res?.event_id ?? res?.id;
        const target = this.isEdit ? this.eventId : newId;
        const navigateToEvent = () => {
          void this.router.navigate(target ? [this.config.basePath, target] : [this.config.basePath]);
        };

        if (res?.warning) {
          void showAppAlert({
            icon: 'warning',
            title: 'Schedule overlap',
            text: res.warning,
            confirmButtonText: 'Continue',
          }).then(navigateToEvent);
          return;
        }

        navigateToEvent();
      },
      error: (err) => {
        if (
          err?.status === 409 &&
          err?.error?.code === 'EVENT_SCHEDULE_OVERLAP' &&
          !confirmedOverlap
        ) {
          void showAppAlert({
            icon: 'warning',
            title: 'Schedule overlap',
            text: err.error.message,
            showCancelButton: true,
            confirmButtonText: 'Create anyway',
            cancelButtonText: 'Cancel',
            reverseButtons: true
          }).then(result => {
            if (result.isConfirmed) {
              this.saving = true;
              this.saveEvent({ ...payload, confirm_overlap: true }, true);
            } else {
              this.saving = false;
            }
          });
          return;
        }

        console.error('Failed to save the event', err);
        this.saving = false;
        const errors = err?.error?.errors;
        const firstValidationError = errors ? Object.values(errors).flat()[0] : null;
        const reason = typeof firstValidationError === 'string'
          ? firstValidationError
          : err?.error?.message ?? 'We could not save the event. Your answers are still here, so you can try again.';
        this.saveError = reason;

        void showAppAlert({
          icon: 'error',
          title: 'Unable to save event',
          text: reason,
          confirmButtonText: 'OK'
        });
      },
    });
  }
}
