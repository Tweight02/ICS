import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  inject,
  NgZone,
  signal,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportService } from '../../../../core/services/report/report';
import { CommentReadStateService } from '../../../../core/services/report/comment-read-state';
import { ChurchService } from '../../../../core/services/church/church-service';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { UserRole } from '../../../../core/models/user.model';
import { SaveReportItem } from '../../../../core/models/report.model';
import { Button } from '../../../../shared/components/button/button';
import {
  ReportPeriodSelector,
  type ReportPeriodStatus
} from '../../../../shared/reports/period-selector/report-period-selector';
import { showPersistentAppAlert as showAppAlert } from '../../../../shared/utils/app-alert';
import {
  captureReportReturnQueryParams,
  clearReportReturnQueryParams
} from '../../../../shared/utils/report-navigation';
import {
  buildQuarterlyFormCsvItems,
  buildQuarterlyFormCsvRows,
  csvFilenamePart,
  downloadCsv,
  downloadStyledQuarterlyExcel
} from '../../../../shared/utils/csv-export';

interface QuarterRecord {
  quarter_id: number;
  quarter?: string;
  year?: number | string;
  value: number | string | null;
  participant_count?: number;
  completed_event_count?: number;
  combined_value?: number | null;
  date_submitted?: string | null;
  district_endorse?: string | null;
  mission_approve: string | null;
  monthly_values?: Record<string, number | null>;
}

interface Quarter {
  quarter_id: number;
  quarter: string;
  year: number;
}

interface Particular {
  particular_id: number;
  particular_name: string;
  quarters: QuarterRecord[];
}

interface Section {
  program_id?: number;
  program_name?: string;
  section_name?: string;
  particulars: Particular[];
}

interface Program {
  program_id: number;
  program_name: string;
  sections: Section[];
}

interface Report {
  department?: { department_id?: number; department_name?: string };
  programs: Program[];
}

const STEWARDSHIP_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface ReportComment {
  comment_id: number;
  quarter_id: number;
  commented_by: number;
  details: string;
  date_commented: string;
  status?: string | null;
  commenter_name?: string;
  commenter_role?: string;
  quarter?: string;
  year?: number | string;
}

interface QuarterRef {
  quarter_id: number;
  quarter?: string;
  year?: number | string;
}

type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-report-particulars',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, ReportPeriodSelector],
  templateUrl: '../../../../shared/reports/report-particulars/report-particulars.html'
})
export class ReportParticulars implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  expandFirstSection = true;
  showInputsWhenReadOnly = false;
  private readonly autoSaveStatusState = signal<AutoSaveStatus>('idle');
  private savedStatusTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly autoSaveDelayMs = 800;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSaving = false;
  private autoSaveQueue: SaveReportItem[] | null = null;
  private pendingSubmission: SaveReportItem[] | null = null;
  private destroyed = false;

  get autoSaveStatus(): AutoSaveStatus {
    return this.autoSaveStatusState();
  }

  set autoSaveStatus(value: AutoSaveStatus) {
    this.autoSaveStatusState.set(value);
    if (this.savedStatusTimer) {
      clearTimeout(this.savedStatusTimer);
      this.savedStatusTimer = null;
    }

    if (value === 'saved' && !this.destroyed) {
      this.savedStatusTimer = setTimeout(() => {
        this.savedStatusTimer = null;
        if (this.autoSaveStatus === 'saved') {
          this.autoSaveStatusState.set('idle');
          this.refreshView();
        }
      }, 3000);
    }
  }

  blurNumberInputOnWheel(event: WheelEvent): void {
    if (event.currentTarget instanceof HTMLInputElement) {
      event.currentTarget.blur();
    }
  }

  @ViewChild('commentMessages')
  private commentMessages?: ElementRef<HTMLUListElement>;

  @ViewChild('quarterlyReportPreviewOverlay')
  private quarterlyReportPreviewOverlay?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportService = inject(ReportService);
  private readonly commentReadState = inject(CommentReadStateService);
  private readonly churchService = inject(ChurchService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private quarterlyReportPreviewParent: Node | null = null;
  private reportReturnQueryParams: Record<string, string> = {};

  @Input() embedded = false;
  @Input() churchId = 0;
  @Input() churchName = '';
  @Input() districtId = 0;
  @Input() districtName = '';
  districtPastorName = '';
  @Input() departmentId = 0;
  report: Report | null = null;

  availableQuarters: Quarter[] = [];
  availableYears: number[] = [];

  selectedYear: number | null = null;
  selectedQuarterId: number | null = null;
  selectedProgramId: number | null = null;
  quarterlyReportPreviewOpen = false;
  quarterlyReportPreviewRows: unknown[][] = [];
  quarterlyReportPreviewColumnCount = 1;
  exportingQuarterReportExcel = false;

  isAnnualView = false;
  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }

  private readonly savingActionState = signal(false);
  get savingAction(): boolean {
    return this.savingActionState();
  }
  set savingAction(value: boolean) {
    this.savingActionState.set(value);
  }
  errorMessage = '';

  comments: ReportComment[] = [];
  private readonly commentsLoadingState = signal(false);
  get commentsLoading(): boolean {
    return this.commentsLoadingState();
  }
  set commentsLoading(value: boolean) {
    this.commentsLoadingState.set(value);
  }
  commentsError = '';
  newComment = '';
  private readonly savingCommentState = signal(false);
  get savingComment(): boolean {
    return this.savingCommentState();
  }
  set savingComment(value: boolean) {
    this.savingCommentState.set(value);
  }

  currentUserRole: UserRole | null = null;
  currentUserId = 0;
  mobileCommentsOpen = false;
  private commentPollingTimer: ReturnType<typeof setInterval> | null = null;
  private commentsRequestInFlight = false;
  private readonly commentPollingIntervalMs = 5000;

  ngOnInit(): void {
    if (!this.embedded) {
      this.reportReturnQueryParams = captureReportReturnQueryParams(this.route);
      clearReportReturnQueryParams(this.router, this.route);
    }

    const user = this.auth.getCurrentUser();
    this.currentUserRole = user?.role ?? null;
    this.currentUserId = Number(user?.user_id) || 0;

    if (this.embedded) {
      this.loadReport();
    } else {
      this.route.paramMap.subscribe(() => this.readRoute());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['districtId'] && this.districtId > 0) {
      this.resolveDistrictPastor();
    }

    if (
      this.embedded &&
      !changes['departmentId']?.firstChange &&
      this.departmentId > 0 &&
      this.churchId > 0
    ) {
      this.loadReport();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.savedStatusTimer) {
      clearTimeout(this.savedStatusTimer);
      this.savedStatusTimer = null;
    }
    this.flushAutoSave();
    this.stopCommentPolling();
    this.restoreQuarterlyReportPreviewOverlay();
  }

  ngAfterViewInit(): void {
    const overlay = this.quarterlyReportPreviewOverlay?.nativeElement;
    if (!overlay || !this.document.body) {
      return;
    }

    this.quarterlyReportPreviewParent = overlay.parentNode;
    this.document.body.appendChild(overlay);
  }

  get canComment(): boolean {
    return ['pastor', 'district pastor', 'assistant', 'administrative assistant', 'head assistant']
      .includes(this.normalizedUserRole);
  }

  get canEndorse(): boolean {
    return ['pastor', 'district pastor'].includes(this.normalizedUserRole);
  }

  get canApprove(): boolean {
    return ['assistant', 'administrative assistant'].includes(this.normalizedUserRole);
  }

  get canEditDepartmentReport(): boolean {
    return this.embedded &&
      [16, 20].includes(this.departmentId) &&
      ['pastor', 'district pastor'].includes(this.normalizedUserRole);
  }

  get canExportQuarterReport(): boolean {
    const role = String(this.auth.getCurrentUser()?.role ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, ' ');
    return [
      'director',
      'head director',
      'assistant',
      'administrative assistant',
      'head assistant',
      'pastor',
      'district pastor',
      'representative'
    ]
      .includes(role);
  }

  isRepresentative(): boolean {
    return this.normalizedUserRole === 'representative';
  }

  openQuarterReportPreview(): void {
    const quarter = this.getSelectedQuarter();
    const program = this.getSelectedProgram();
    if (!this.canExportQuarterReport || this.isAnnualView || !quarter || !program) {
      return;
    }

    this.quarterlyReportPreviewRows = this.buildQuarterReportRows(quarter, program);
    this.quarterlyReportPreviewColumnCount = Math.max(
      1,
      ...this.quarterlyReportPreviewRows.map(row => row.length)
    );
    this.quarterlyReportPreviewOpen = true;
  }

  closeQuarterReportPreview(): void {
    this.quarterlyReportPreviewOpen = false;
  }

  private restoreQuarterlyReportPreviewOverlay(): void {
    const overlay = this.quarterlyReportPreviewOverlay?.nativeElement;
    if (overlay && this.quarterlyReportPreviewParent) {
      this.quarterlyReportPreviewParent.appendChild(overlay);
      this.quarterlyReportPreviewParent = null;
    }
  }

  isQuarterlyReportHeaderRow(row: readonly unknown[]): boolean {
    return row.some(cell =>
      typeof cell === 'string' &&
      ['PARTICULAR', 'CHURCH', 'CHURCHES/COMPANY', 'QUARTER'].includes(cell.toUpperCase())
    );
  }

  exportQuarterReportCsv(): void {
    if (!this.canExportQuarterReport || !this.quarterlyReportPreviewRows.length) {
      return;
    }

    const quarter = this.getSelectedQuarter();
    const filename = `${csvFilenamePart(this.report?.department?.department_name ?? 'department')}-${quarter?.year ?? this.selectedYear}-${quarter?.quarter.toLowerCase() ?? 'quarter'}-report.csv`;
    downloadCsv(filename, this.quarterlyReportPreviewRows);
  }

  async exportQuarterReportExcel(): Promise<void> {
    if (!this.canExportQuarterReport || !this.quarterlyReportPreviewRows.length || this.exportingQuarterReportExcel) {
      return;
    }

    const quarter = this.getSelectedQuarter();
    const filename = `${csvFilenamePart(this.report?.department?.department_name ?? 'department')}-${quarter?.year ?? this.selectedYear}-${quarter?.quarter.toLowerCase() ?? 'quarter'}-report.xlsx`;
    this.exportingQuarterReportExcel = true;
    try {
      await downloadStyledQuarterlyExcel(filename, this.quarterlyReportPreviewRows);
    } catch (error) {
      console.error('Unable to export the quarterly report as Excel.', error);
      void showAppAlert({
        icon: 'error',
        title: 'Export failed',
        text: 'Unable to create the formatted Excel report. Please try again.'
      });
    } finally {
      this.exportingQuarterReportExcel = false;
    }
  }

  printQuarterReport(): void {
    if (!this.canExportQuarterReport || !this.quarterlyReportPreviewRows.length) {
      return;
    }
    window.print();
  }

  private buildQuarterReportRows(quarter: Quarter, program: Program): unknown[][] {
    const quarterCode = quarter.quarter.toUpperCase() as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    const items = buildQuarterlyFormCsvItems(
      program.sections,
      quarter.year,
      quarterCode
    );
    return buildQuarterlyFormCsvRows({
      departmentId: Number(this.report?.department?.department_id ?? this.departmentId),
      departmentName: this.report?.department?.department_name ?? 'Department',
      programName: program.program_name,
      churchName: this.churchName,
      districtName: this.districtName,
      districtPastorName: this.districtPastorName,
      year: quarter.year,
      quarter: quarterCode,
      items,
      months: this.isStewardshipReport ? this.getQuarterMonthNames(quarter) : []
    });
  }

  canSubmitSelectedQuarter(): boolean {
    return true;
  }

  get commentUnavailableMessage(): string {
    return 'View only. Comments cannot be added from this account.';
  }

  private get normalizedUserRole(): string {
    return String(this.currentUserRole ?? '')
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ');
  }

  private readRoute(): void {
    const pathParams = this.route.snapshot.paramMap;
    const queryParams = this.route.snapshot.queryParamMap;
    const departmentId = Number(pathParams.get('departmentId'));

    this.departmentId = departmentId;
    this.churchId =
      Number(pathParams.get('churchId') || queryParams.get('church_id')) || 0;
    this.churchName = queryParams.get('church_name') || '';
    this.districtId =
      Number(pathParams.get('districtId') || queryParams.get('district_id')) || 0;
    this.districtName = queryParams.get('district_name') || '';

    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      this.errorMessage = 'Department ID was not provided.';
      return;
    }

    if (!this.churchId) {
      this.errorMessage = 'Church ID was not provided.';
      return;
    }

    this.resolveChurchLabels();
    this.resolveDistrictPastor();
    this.loadReport();
  }

  private resolveDistrictPastor(): void {
    if (!this.districtId) {
      this.districtPastorName = '';
      return;
    }

    this.churchService.getDistricts().subscribe({
      next: response => {
        const district = response.data.find(
          item => Number(item.church_id) === this.districtId
        );
        this.districtPastorName = district?.pastor_name ?? '';
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Unable to resolve assigned district pastor:', error);
        this.cdr.detectChanges();
      }
    });
  }

  private resolveChurchLabels(): void {
    if (!this.districtId || (this.churchName && this.districtName)) {
      return;
    }

    this.churchService.getChurches(this.districtId).subscribe({
      next: response => {
        this.districtName = this.districtName || response.district?.name || '';
        const church = (response.data || []).find(
          item => Number(item.church_id) === this.churchId
        );
        this.churchName = this.churchName || church?.name || '';
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Unable to resolve report church labels:', error);
        this.cdr.detectChanges();
      }
    });
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.reportService
      .getDepartmentReport(this.churchId, this.departmentId)
      .subscribe({
        next: (response: any) => {
          this.report = (response?.data ?? response) as Report;
          this.useCombinedValuesForInputs();
          this.initializeSelections();
          this.loading = false;
          this.cdr.detectChanges();
          this.loadComments();
        },
        error: (error: any) => {
          this.errorMessage =
            error?.error?.message || 'Unable to load report.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private useCombinedValuesForInputs(): void {
    for (const program of this.report?.programs ?? []) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          for (const record of particular.quarters ?? []) {
            if (record.monthly_values) continue;

            if (record.combined_value !== null && record.combined_value !== undefined) {
              record.value = record.combined_value;
            } else if ((record.participant_count ?? 0) > 0) {
              record.value = record.participant_count ?? 0;
            }
          }
        }
      }
    }
  }

  private initializeSelections(): void {
    const programs = this.report?.programs ?? [];

    if (!programs.some(program => program.program_id === this.selectedProgramId)) {
      this.selectedProgramId = programs[0]?.program_id ?? null;
    }

    const unique = new Map<string, Quarter>();

    for (const program of programs) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          for (const record of particular.quarters ?? []) {
            const year = Number(record.year);
            const number = this.quarterNumber(record.quarter ?? '');

            if (!record.quarter_id || !year || number < 1 || number > 4) {
              continue;
            }

            const key = `${year}-Q${number}`;

            if (!unique.has(key)) {
              unique.set(key, {
                quarter_id: record.quarter_id,
                quarter: `Q${number}`,
                year
              });
            }
          }
        }
      }
    }

    this.availableQuarters = [...unique.values()].sort(
      (a, b) =>
        a.year - b.year ||
        this.quarterNumber(a.quarter) - this.quarterNumber(b.quarter)
    );

    this.availableYears = [
      ...new Set(this.availableQuarters.map(quarter => quarter.year))
    ].sort((a, b) => b - a);

    const queryParams = this.route.snapshot.queryParamMap;
    const requestedYear = Number(queryParams.get('year'));
    if (this.availableYears.includes(requestedYear)) {
      this.selectedYear = requestedYear;
    } else if (
      this.selectedYear === null ||
      !this.availableYears.includes(this.selectedYear)
    ) {
      this.selectedYear = this.availableYears[0] ?? null;
    }

    const requestedQuarter = String(queryParams.get('quarter') ?? '')
      .toUpperCase()
      .match(/(?:Q|QUARTER\s*)?([1-4])/);
    const requestedQuarterNumber = requestedQuarter
      ? Number(requestedQuarter[1])
      : 0;
    const matchingRequestedQuarter = this.getQuartersForYear().find(
      quarter => this.quarterNumber(quarter.quarter) === requestedQuarterNumber
    );
    if (matchingRequestedQuarter) {
      this.selectedQuarterId = matchingRequestedQuarter.quarter_id;
    } else if (
      !this.getQuartersForYear().some(
        quarter => quarter.quarter_id === this.selectedQuarterId
      )
    ) {
      this.selectedQuarterId =
        this.getQuartersForYear()[0]?.quarter_id ?? null;
    }
  }

  private quarterNumber(name: string): number {
    const match = String(name)
      .toUpperCase()
      .match(/(?:Q|QUARTER\s*)?([1-4])/);

    return match ? Number(match[1]) : 0;
  }

  getQuartersForYear(): Quarter[] {
    return this.availableQuarters.filter(
      quarter => quarter.year === this.selectedYear
    );
  }

  getQuarterStatuses(): Record<number, ReportPeriodStatus> {
    const statuses: Record<number, ReportPeriodStatus> = {};
    for (const quarter of this.getQuartersForYear()) {
      statuses[quarter.quarter_id] = this.isQuarterApproved(quarter)
        ? 'approved'
        : this.isQuarterEndorsed(quarter)
          ? 'endorsed'
          : null;
    }
    return statuses;
  }

  getVisibleQuarters(): Quarter[] {
    if (this.isAnnualView) {
      return this.getQuartersForYear();
    }

    const quarter = this.getSelectedQuarter();
    return quarter ? [quarter] : [];
  }

  getSelectedQuarter(): Quarter | null {
    return this.getQuartersForYear().find(
      quarter => quarter.quarter_id === this.selectedQuarterId
    ) ?? null;
  }

  selectYear(year: number): void {
    if (this.savingAction) return;

    this.flushAutoSave();
    this.selectedYear = Number(year);
    this.isAnnualView = false;
    this.selectedQuarterId =
      this.getQuartersForYear()[0]?.quarter_id ?? null;
    this.clearMessages();
  }

  selectQuarter(quarter: Quarter): void {
    if (this.savingAction) return;

    this.flushAutoSave();
    this.isAnnualView = false;
    this.selectedQuarterId = quarter.quarter_id;
    this.clearMessages();
  }

  selectAnnual(): void {
    if (this.savingAction) return;

    this.flushAutoSave();
    this.isAnnualView = true;
    this.clearMessages();
  }

  selectProgram(programId: number): void {
    if (this.savingAction) return;

    this.flushAutoSave();
    this.selectedProgramId = programId;
    this.clearMessages();
  }

  getSelectedProgram(): Program | null {
    return this.report?.programs?.find(
      program => program.program_id === this.selectedProgramId
    ) ?? null;
  }

  get isStewardshipReport(): boolean {
    return Number(this.report?.department?.department_id ?? this.departmentId) === 14;
  }

  get isAyQuarterlyStatisticsReport(): boolean {
    return Number(this.report?.department?.department_id ?? this.departmentId) === 17 &&
      /statistics/i.test(this.getSelectedProgram()?.program_name ?? '');
  }

  getVisibleSections(program: Program): Section[] {
    return program.sections;
  }

  getStewardshipTotal(type: 'offering' | 'tithe'): number {
    const sections = this.getSelectedProgram()?.sections ?? [];
    const quarter = this.getSelectedQuarter();

    return sections
      .filter(section => this.isOfferingSection(section))
      .flatMap(section => section.particulars)
      .filter(particular => particular.particular_name.toLowerCase().includes(type))
      .reduce((total, particular) => {
        const records = this.isAnnualView
          ? particular.quarters.filter(record => Number(record.year) === this.selectedYear)
          : quarter
            ? [this.getParticularQuarterRecord(particular, quarter)].filter(
                (record): record is QuarterRecord => record !== null
              )
            : [];

        return total + records.reduce((subtotal, record) => {
          const value = Number(record.value);
          return Number.isFinite(value) ? subtotal + value : subtotal;
        }, 0);
      }, 0);
  }

  private isOfferingSection(section: Section): boolean {
    const name = (section.program_name ?? section.section_name ?? '').toLowerCase();
    return name.includes('offering') || name.includes('tithe');
  }

  isStewardshipMonthlySection(section: Section): boolean {
    return this.isStewardshipReport && this.isOfferingSection(section);
  }

  getQuarterMonthNames(quarter: Quarter): string[] {
    const quarterNumber = this.quarterNumber(quarter.quarter);
    const firstMonthIndex = (quarterNumber - 1) * 3;
    return STEWARDSHIP_MONTHS.slice(firstMonthIndex, firstMonthIndex + 3);
  }

  updateStewardshipMonth(record: QuarterRecord, month: string, value: number | string | null): void {
    const monthValue = value === '' || value === null ? null : Number(value);
    record.monthly_values = { ...(record.monthly_values ?? {}), [month]: monthValue };
    record.value = Object.values(record.monthly_values).reduce<number>(
      (total, amount) => total + (amount ?? 0),
      0
    );
  }

  updateReportStewardshipMonth(
    _particular: Particular,
    quarter: Quarter,
    record: QuarterRecord,
    month: string,
    value: number | string | null
  ): void {
    if (
      !this.canEditDepartmentReport ||
      this.isAnnualView ||
      this.savingAction ||
      this.isQuarterApproved(quarter)
    ) {
      return;
    }

    const monthValue = value === '' || value === null ? null : Number(value);
    if (monthValue !== null && (!Number.isFinite(monthValue) || monthValue < 0)) {
      this.errorMessage = 'Enter a valid non-negative number.';
      return;
    }

    this.updateStewardshipMonth(record, month, monthValue);
    this.clearMessages();
    this.scheduleAutoSave();
  }

  getStewardshipMonthValue(record: QuarterRecord, month: string): number | null {
    return record.monthly_values?.[month] ?? null;
  }

  getParticularQuarterRecord(
    particular: Particular,
    quarter: Quarter
  ): QuarterRecord | null {
    return particular.quarters?.find(record =>
      this.matchesQuarter(record, quarter)
    ) ?? null;
  }

  updateReportValue(
    particular: Particular,
    quarter: Quarter,
    value: number | string | null
  ): void {
    if (
      !this.canEditDepartmentReport ||
      this.isAnnualView ||
      this.savingAction ||
      this.isQuarterApproved(quarter)
    ) {
      return;
    }

    const record = this.getParticularQuarterRecord(particular, quarter);
    if (!record) {
      this.errorMessage = 'This report quarter is unavailable.';
      return;
    }

    const minimum =
      (record.participant_count ?? 0) + (record.completed_event_count ?? 0);
    if (value === '' || value === null) {
      record.value = minimum > 0 ? minimum : null;
      record.combined_value =
        typeof record.value === 'number' ? record.value : null;
    } else {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        this.errorMessage = 'Enter a valid non-negative number.';
        return;
      }
      record.value = Math.max(numeric, minimum);
      record.combined_value = record.value;
    }

    this.clearMessages();
    this.scheduleAutoSave();
  }

  private hasFlag(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  isRecordApproved(record: QuarterRecord | null): boolean {
    return this.hasFlag(record?.mission_approve);
  }

  isRecordSubmitted(record: QuarterRecord | null): boolean {
    return this.hasFlag(record?.date_submitted);
  }

  isRecordEndorsed(record: QuarterRecord | null): boolean {
    return this.hasFlag(record?.district_endorse) && !this.isRecordApproved(record);
  }

  isQuarterApproved(quarter: Quarter | null = this.getSelectedQuarter()): boolean {
    if (!quarter) {
      return false;
    }

    return this.collectQuarterRecords(quarter).some(record =>
      this.isRecordApproved(record)
    );
  }

  isQuarterEndorsed(quarter: Quarter | null = this.getSelectedQuarter()): boolean {
    if (!quarter || this.isQuarterApproved(quarter)) {
      return false;
    }

    const records = this.collectQuarterRecords(quarter);

    return records.length > 0 &&
      records.every(record => this.hasFlag(record.district_endorse));
  }

  isQuarterSubmitted(quarter: Quarter | null = this.getSelectedQuarter()): boolean {
    if (!quarter) {
      return false;
    }

    const programs = this.report?.programs ?? [];

    return programs.length > 0 && programs.every(program => {
      const records = program.sections.flatMap(section =>
        section.particulars
          .map(particular => this.getParticularQuarterRecord(particular, quarter))
          .filter((record): record is QuarterRecord => record !== null)
      );

      return records.length > 0 &&
        records.every(record => this.hasFlag(record.date_submitted));
    });
  }

  private collectQuarterRecords(quarter: Quarter): QuarterRecord[] {
    const records: QuarterRecord[] = [];

    for (const program of this.report?.programs ?? []) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          const record = this.getParticularQuarterRecord(particular, quarter);

          if (record) {
            records.push(record);
          }
        }
      }
    }

    return records;
  }

  getQuarterValue(
    particular: Particular,
    quarter: Quarter
  ): number | string | null {
    return this.getParticularQuarterRecord(particular, quarter)?.value ?? null;
  }

  loadComments(silent = false): void {
    if (this.commentsRequestInFlight) return;

    this.commentsRequestInFlight = true;
    if (!silent) {
      this.commentsLoading = true;
      this.commentsError = '';
      this.cdr.detectChanges();
    }

    const previousVisibleIds = new Set(
      this.getVisibleComments().map(comment => comment.comment_id)
    );

    this.reportService
      .getDepartmentComments(this.churchId, this.departmentId)
      .subscribe({
        next: (response: any) => {
          const list = response?.data ?? response;
          const nextComments: ReportComment[] = Array.isArray(list) ? list : [];
          const wasNearBottom = this.isCommentListNearBottom();
          const hasNewVisibleComment = nextComments.some(comment =>
            !previousVisibleIds.has(comment.comment_id) &&
            this.getVisibleQuarters().some(quarter =>
              this.matchesQuarter(comment, quarter)
            )
          );

          this.comments = nextComments;
          this.commentsLoading = false;
          this.commentsError = '';
          this.commentsRequestInFlight = false;
          this.cdr.detectChanges();
          if (this.mobileCommentsOpen && hasNewVisibleComment && wasNearBottom) {
            this.markVisibleCommentsRead();
            this.scrollCommentMessagesToLatest();
          }
          this.startCommentPolling();
        },
        error: (error: any) => {
          this.commentsRequestInFlight = false;
          if (!silent) {
            this.commentsError =
              error?.error?.message || 'Unable to load comments.';
            this.commentsLoading = false;
            this.cdr.detectChanges();
          }
          this.startCommentPolling();
        }
      });
  }

  private startCommentPolling(): void {
    if (this.commentPollingTimer) return;

    this.commentPollingTimer = this.ngZone.runOutsideAngular(() =>
      setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          this.loadComments(true);
        }
      }, this.commentPollingIntervalMs)
    );
  }

  private stopCommentPolling(): void {
    if (!this.commentPollingTimer) return;

    clearInterval(this.commentPollingTimer);
    this.commentPollingTimer = null;
  }

  getVisibleComments(): ReportComment[] {
    const quarters = this.getVisibleQuarters();

    return this.comments
      .filter(comment =>
        quarters.some(quarter => this.matchesQuarter(comment, quarter))
      )
      .sort(
        (a, b) =>
          String(a.date_commented).localeCompare(String(b.date_commented)) ||
          a.comment_id - b.comment_id
      );
  }

  getCommentStatus(): 'commented' | 'none' {
    return this.getVisibleComments().length > 0 ? 'commented' : 'none';
  }

  isOwnComment(comment: ReportComment): boolean {
    return comment.commented_by === this.currentUserId;
  }

  openComments(): void {
    this.mobileCommentsOpen = true;
    this.markVisibleCommentsRead();
    this.cdr.detectChanges();
    this.scrollCommentMessagesToLatest();
    this.loadComments(true);
  }

  closeComments(): void {
    this.mobileCommentsOpen = false;
  }

  getUnreadCommentCount(): number {
    return this.commentReadState.getUnreadCount(
      this.comments,
      this.currentUserId,
      this.churchId,
      this.departmentId
    );
  }

  private markVisibleCommentsRead(): void {
    this.commentReadState.markAsRead(
      this.getVisibleComments(),
      this.currentUserId,
      this.churchId,
      this.departmentId
    );
  }

  onCommentMessagesScroll(): void {
    if (
      this.mobileCommentsOpen &&
      this.isCommentListNearBottom() &&
      this.getUnreadCommentCount() > 0
    ) {
      this.markVisibleCommentsRead();
      this.cdr.detectChanges();
    }
  }

  private isCommentListNearBottom(): boolean {
    const messages = this.commentMessages?.nativeElement;

    return !messages ||
      messages.scrollHeight - messages.scrollTop - messages.clientHeight < 64;
  }

  private scrollCommentMessagesToLatest(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const messages = this.commentMessages?.nativeElement;

        if (this.mobileCommentsOpen && messages) {
          messages.scrollTop = messages.scrollHeight;
        }
      });
    });
  }

  getCommentQuarterLabel(comment: ReportComment): string {
    if (comment.quarter) {
      return `${comment.quarter}${comment.year ? ' ' + comment.year : ''}`;
    }

    const match = this.availableQuarters.find(
      quarter => quarter.quarter_id === comment.quarter_id
    );

    return match ? `${match.quarter} ${match.year}` : '';
  }

  getInitials(name?: string): string {
    const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);

    if (!parts.length) {
      return 'P';
    }

    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ''))
      .toUpperCase();
  }

  private matchesQuarter(item: QuarterRef, quarter: Quarter): boolean {
    if (item.quarter_id === quarter.quarter_id) {
      return true;
    }

    return (
      !!item.quarter &&
      !!item.year &&
      this.quarterNumber(item.quarter) === this.quarterNumber(quarter.quarter) &&
      Number(item.year) === quarter.year
    );
  }

  commentQuarterId(): number {
    const selected = this.getSelectedQuarter();

    if (!selected) {
      return 0;
    }

    const program = this.getSelectedProgram();

    for (const section of program?.sections ?? []) {
      for (const particular of section.particulars ?? []) {
        const record = this.getParticularQuarterRecord(particular, selected);

        if (record?.quarter_id) {
          return record.quarter_id;
        }
      }
    }

    return selected.quarter_id;
  }

  publishComment(): void {
    const details = this.newComment.trim();

    if (!details || this.savingComment || !this.canComment) {
      return;
    }

    if (details.length > 255) {
      this.errorMessage = 'Comments must not exceed 255 characters.';
      return;
    }

    if (this.isAnnualView) {
      this.errorMessage = 'Select a quarter to add a comment.';
      return;
    }

    const quarterId = this.commentQuarterId();

    if (!quarterId) {
      this.errorMessage = 'No report quarter is available for comments.';
      return;
    }

    if (this.isQuarterApproved()) {
      this.errorMessage = 'This report has been approved. Comments are closed.';
      return;
    }

    this.savingComment = true;
    this.errorMessage = '';

    this.reportService
      .addComment(quarterId, this.churchId, this.departmentId, details)
      .subscribe({
        next: (response: any) => {
          const comment = response?.data ?? response;

          if (comment) {
            this.comments.unshift(comment as ReportComment);
          }

          this.newComment = '';
          this.savingComment = false;
          this.cdr.detectChanges();
          this.scrollCommentMessagesToLatest();
        },
        error: (error: any) => {
          this.savingComment = false;
          this.errorMessage =
            error?.error?.message || 'Unable to save comment.';
          this.cdr.detectChanges();
        }
      });
  }

  submitPersonalReport(): void {
    const quarter = this.getSelectedQuarter();

    if (!this.canEditDepartmentReport || this.isAnnualView || !quarter || this.savingAction) {
      return;
    }

    if (this.isQuarterApproved(quarter)) {
      this.errorMessage = 'This report has already been approved and cannot be edited.';
      return;
    }

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.autoSaveQueue = null;

    const items = this.buildReportItems(quarter);
    if (!items) return;

    if (items.length === 0) {
      this.errorMessage = 'No report items are available to submit.';
      return;
    }

    if (this.autoSaving) {
      this.pendingSubmission = items;
      this.savingAction = true;
      return;
    }

    this.sendSubmission(items);
  }

  private buildReportItems(quarter: Quarter): SaveReportItem[] | null {
    const items: SaveReportItem[] = [];
    for (const program of this.report?.programs ?? []) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          const record = this.getParticularQuarterRecord(particular, quarter);
          if (!record) continue;

          const value = record.value === null || record.value === ''
            ? null
            : Number(record.value);
          if (value !== null && (!Number.isFinite(value) || value < 0)) {
            this.errorMessage = `Enter a valid non-negative value for ${particular.particular_name}.`;
            return null;
          }

          items.push({
            particular_id: particular.particular_id,
            quarter_id: record.quarter_id,
            value,
            ...(!record.monthly_values ? { value_includes_participants: true } : {}),
            ...(record.monthly_values ? { monthly_values: record.monthly_values } : {})
          });
        }
      }
    }
    return items;
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveStatus = 'pending';
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.autoSave();
    }, this.autoSaveDelayMs);
  }

  private flushAutoSave(): void {
    if (!this.autoSaveTimer) return;

    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = null;
    this.autoSave();
  }

  private autoSave(): void {
    const quarter = this.getSelectedQuarter();
    if (
      !this.canEditDepartmentReport ||
      this.isAnnualView ||
      !quarter ||
      this.isQuarterApproved(quarter)
    ) {
      this.autoSaveStatus = 'idle';
      return;
    }

    const items = this.buildReportItems(quarter);
    if (!items) {
      this.autoSaveStatus = 'error';
      this.refreshView();
      return;
    }
    if (items.length === 0) {
      this.autoSaveStatus = 'idle';
      return;
    }

    this.sendAutoSave(items);
  }

  private sendAutoSave(items: SaveReportItem[]): void {
    if (this.autoSaving) {
      this.autoSaveQueue = items;
      return;
    }

    this.autoSaving = true;
    this.autoSaveStatus = 'saving';
    this.refreshView();
    this.reportService
      .saveDepartmentReport(this.churchId, this.departmentId, items)
      .subscribe({
        next: () => this.finishAutoSave(true),
        error: error => this.finishAutoSave(false, error)
      });
  }

  private finishAutoSave(
    success: boolean,
    error?: { error?: { message?: string } }
  ): void {
    this.autoSaving = false;
    if (success) {
      this.autoSaveStatus = this.autoSaveTimer ? 'pending' : 'saved';
    } else {
      this.autoSaveStatus = 'error';
      this.errorMessage =
        error?.error?.message || 'Auto-save failed. Please try again.';
    }

    if (this.pendingSubmission) {
      const items = this.pendingSubmission;
      this.pendingSubmission = null;
      this.autoSaveQueue = null;
      this.sendSubmission(items);
      return;
    }

    const queued = this.autoSaveQueue;
    if (queued) {
      this.autoSaveQueue = null;
      this.sendAutoSave(queued);
      return;
    }
    this.refreshView();
  }

  private sendSubmission(items: SaveReportItem[]): void {
    this.savingAction = true;
    this.errorMessage = '';
    this.reportService
      .saveDepartmentReport(this.churchId, this.departmentId, items, true)
      .subscribe({
        next: response => {
          this.savingAction = false;
          this.autoSaveStatus = 'saved';
          this.showSuccess(response?.message || 'Report submitted.');
          this.loadReport();
        },
        error: error => {
          this.savingAction = false;
          this.errorMessage = error?.error?.message || 'Unable to submit report.';
          this.cdr.detectChanges();
        }
      });
  }

  private refreshView(): void {
    if (!this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  endorseReport(): void {
    this.updateWorkflow('endorse');
  }

  approveReport(): void {
    this.updateWorkflow('approve');
  }

  private updateWorkflow(action: 'endorse' | 'approve'): void {
    if ((action === 'endorse' && !this.canEndorse) ||
        (action === 'approve' && !this.canApprove)) {
      this.errorMessage = 'Your account is not authorized for this report action.';
      return;
    }

    const quarter = this.getSelectedQuarter();
    const program = this.getSelectedProgram();

    if (this.isAnnualView || !quarter || !program || this.savingAction) {
      this.errorMessage = 'Select a report program and quarter first.';
      return;
    }

    if (action === 'endorse' && !this.isQuarterSubmitted(quarter)) {
      this.errorMessage = 'The representative must submit all report data before endorsement.';
      return;
    }

    this.savingAction = true;
    this.errorMessage = '';

    const request = action === 'endorse'
      ? this.reportService.endorseDepartmentReport(
          this.churchId,
          this.departmentId,
          program.program_id,
          quarter.year,
          quarter.quarter
        )
      : this.reportService.approveDepartmentReport(
          this.churchId,
          this.departmentId,
          program.program_id,
          quarter.year,
          quarter.quarter
        );

    request.subscribe({
      next: response => {
        this.showSuccess(
          response?.message ||
          (action === 'endorse'
            ? 'Report endorsed for the administrative assistant.'
            : 'Report approved.')
        );
        this.savingAction = false;
        this.loadReport();
      },
      error: (error: any) => {
        this.savingAction = false;
        this.errorMessage =
          error?.error?.message ||
          (action === 'endorse'
            ? 'Unable to endorse this report.'
            : 'Unable to approve this report.');
        this.cdr.detectChanges();
      }
    });
  }

  private showSuccess(message: string): void {
    void showAppAlert({
      icon: 'success',
      title: 'Success',
      text: message,
      confirmButtonColor: '#047857'
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
  }

  backToPrograms(): void {
    const returnParams = Object.keys(this.reportReturnQueryParams).length
      ? this.reportReturnQueryParams
      : captureReportReturnQueryParams(this.route);

    if (this.portalPrefix() === '/pastor') {
      if (returnParams['return_to'] === 'district-reports') {
        this.router.navigate(['/pastor/reports/details'], {
          queryParams: {
            year: String(this.selectedYear),
            return_to: 'district-reports',
            return_church: returnParams['return_church'] ?? '',
            return_scroll: returnParams['return_scroll'] ?? '0'
          }
        });
        return;
      }

      this.router.navigate(['/pastor/reports/details'], {
        queryParams: {
          year: String(this.selectedYear),
          ...returnParams
        }
      });
      return;
    }

    if (returnParams['return_to'] === 'monitoring') {
      this.reportReturnQueryParams = returnParams;
      this.router.navigate([`${this.portalPrefix()}/reports`], {
        queryParams: this.monitoringReturnParams()
      });
      return;
    }

    if (this.districtId && this.churchId) {
      this.router.navigate([
        `${this.portalPrefix()}/reports/programs`,
        this.districtId,
        this.churchId
      ]);
      return;
    }

    this.router.navigate([`${this.portalPrefix()}/reports/programs`]);
  }

  private monitoringReturnParams(): Record<string, string> {
    const returnParams = Object.keys(this.reportReturnQueryParams).length
      ? this.reportReturnQueryParams
      : captureReportReturnQueryParams(this.route);
    return { ...returnParams, return_to: 'monitoring' };
  }

  private portalPrefix(): '/pastor' | '/assistant' | '/director' {
    const url = this.router.url;

    if (url.startsWith('/assistant')) {
      return '/assistant';
    }

    if (url.startsWith('/director')) {
      return '/director';
    }

    return '/pastor';
  }

  trackQuarter(_index: number, quarter: Quarter): number {
    return quarter.quarter_id;
  }

  trackProgram(_index: number, program: Program): number {
    return program.program_id;
  }

  trackSection(index: number, section: Section): number {
    return section.program_id ?? index;
  }

  trackParticular(_index: number, particular: Particular): number {
    return particular.particular_id;
  }

  trackComment(_index: number, comment: ReportComment): number {
    return comment.comment_id;
  }
}
