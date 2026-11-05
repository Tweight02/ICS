import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BaptismSummaryRecord,
  DeathSummaryRecord,
  MissionReportSummary
} from '../../../core/models/report.model';
import { Department } from '../../../core/models/department.model';
import { AuthService } from '../../../core/services/auth/auth-service';
import { ChurchService } from '../../../core/services/church/church-service';
import {
  CURRENT_REPORT_YEAR,
  REPORT_YEAR_OPTIONS,
  resolveReportYear
} from '../../../core/utils/report-year';
import { RunningLoader } from '../../../shared/components/running-loader/running-loader';

@Component({
  selector: 'app-director-report-summary',
  standalone: true,
  imports: [CommonModule, RunningLoader],
  templateUrl: './report-summary.html'
})
export class DirectorReportSummary implements OnInit {
  private static readonly BAPTISM_RECORD_DEPARTMENT_ID = 22;
  private static readonly DEATH_RECORD_DEPARTMENT_ID = 23;

  readonly reportYears = REPORT_YEAR_OPTIONS;
  readonly selectedYear = signal(CURRENT_REPORT_YEAR);
  readonly summary = signal<MissionReportSummary | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly selectedDepartmentId = signal<number | null>(null);
  readonly departmentDetails = signal<MissionReportSummary | null>(null);
  readonly selectedReportId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly loadingDepartments = signal(false);
  readonly loadingDepartmentDetails = signal(false);
  readonly errorMessage = signal('');
  readonly departmentsErrorMessage = signal('');
  readonly departmentDetailsErrorMessage = signal('');
  readonly selectedRecordQuarter = signal<'Q1' | 'Q2' | 'Q3' | 'Q4' | null>(null);
  readonly selectedBaptismQuarter = this.selectedRecordQuarter;
  readonly baptismRecords = signal<BaptismSummaryRecord[]>([]);
  readonly loadingBaptismRecords = signal(false);
  readonly baptismRecordsErrorMessage = signal('');
  readonly deathRecords = signal<DeathSummaryRecord[]>([]);
  readonly loadingDeathRecords = signal(false);
  readonly deathRecordsErrorMessage = signal('');
  readonly selectedBaptismRecord = signal<BaptismSummaryRecord | null>(null);
  readonly selectedDeathRecord = signal<DeathSummaryRecord | null>(null);
  readonly selectedDepartmentSummary = computed(
    () => this.departmentDetails()?.departments[0] ?? null
  );
  readonly selectedReport = computed(() => {
    const department = this.selectedDepartmentSummary();
    const selectedReportId = this.selectedReportId();
    return department?.reports.find(report => report.program_id === selectedReportId) ?? null;
  });
  readonly selectedDepartmentName = computed(() =>
    this.selectedDepartmentSummary()?.department_name ??
    this.departments().find(
      department => department.department_id === this.selectedDepartmentId()
    )?.department_name ??
    'Department'
  );

  private readonly churchService = inject(ChurchService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  get isAssistantPortal(): boolean {
    return this.router.url.startsWith('/assistant');
  }

  get isMissionWideSummary(): boolean {
    return this.isAssistantPortal;
  }

  get isBaptismDirector(): boolean {
    return !this.isAssistantPortal &&
      this.assignedDepartmentId === DirectorReportSummary.BAPTISM_RECORD_DEPARTMENT_ID;
  }

  get isBaptismDepartmentSelected(): boolean {
    return this.isAssistantPortal
      ? this.selectedDepartmentId() === DirectorReportSummary.BAPTISM_RECORD_DEPARTMENT_ID
      : this.isBaptismDirector;
  }

  get isDeathDirector(): boolean {
    return !this.isAssistantPortal &&
      this.assignedDepartmentId === DirectorReportSummary.DEATH_RECORD_DEPARTMENT_ID;
  }

  get isDeathDepartmentSelected(): boolean {
    return this.isAssistantPortal
      ? this.selectedDepartmentId() === DirectorReportSummary.DEATH_RECORD_DEPARTMENT_ID
      : this.isDeathDirector;
  }

  get isPersonalRecordsDepartmentSelected(): boolean {
    return this.isBaptismDepartmentSelected || this.isDeathDepartmentSelected;
  }

  ngOnInit(): void {
    this.selectedYear.set(
      resolveReportYear(this.route.snapshot.queryParamMap.get('year'))
    );
    if (this.isAssistantPortal) {
      this.loadDepartments();
    } else {
      this.selectedDepartmentId.set(this.assignedDepartmentId);
      if (!this.isBaptismDirector) {
        this.loadDepartmentDetails();
      }
    }
    this.loadSummary();
  }

  private get assignedDepartmentId(): number | null {
    const departmentId = Number(this.authService.getCurrentUser()?.department_id);
    return Number.isInteger(departmentId) && departmentId > 0 ? departmentId : null;
  }

  onYearChange(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    if (!this.reportYears.includes(year) || year === this.selectedYear()) {
      return;
    }

    this.selectedYear.set(year);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadSummary();
    if (!this.isBaptismDirector) {
      this.loadDepartmentDetails();
    }
    if (this.selectedRecordQuarter()) {
      this.loadSelectedRecords();
    }
  }

  isPersonalRecordReport(departmentId: number): boolean {
    const isPersonalRecordDepartment =
      departmentId === DirectorReportSummary.BAPTISM_RECORD_DEPARTMENT_ID ||
      departmentId === DirectorReportSummary.DEATH_RECORD_DEPARTMENT_ID;
    return isPersonalRecordDepartment && (
      this.isAssistantPortal
        ? departmentId === this.selectedDepartmentId()
        : departmentId === this.assignedDepartmentId
    );
  }

  isBaptismReport(departmentId: number): boolean {
    return this.isPersonalRecordReport(departmentId);
  }

  selectRecordQuarter(quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): void {
    if (!this.isPersonalRecordsDepartmentSelected) {
      return;
    }

    if (this.selectedRecordQuarter() === quarter) {
      this.closeReportRecords();
      return;
    }

    this.selectedRecordQuarter.set(quarter);
    this.baptismRecords.set([]);
    this.deathRecords.set([]);
    this.loadSelectedRecords();
  }

  selectBaptismQuarter(quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): void {
    this.selectRecordQuarter(quarter);
  }

  retryReportRecords(): void {
    this.loadSelectedRecords();
  }

  retryBaptismRecords(): void {
    this.retryReportRecords();
  }

  closeReportRecords(): void {
    this.selectedRecordQuarter.set(null);
    this.closePersonDetails();
    this.baptismRecords.set([]);
    this.baptismRecordsErrorMessage.set('');
    this.loadingBaptismRecords.set(false);
    this.deathRecords.set([]);
    this.deathRecordsErrorMessage.set('');
    this.loadingDeathRecords.set(false);
  }

  closeBaptismRecords(): void {
    this.closeReportRecords();
  }

  openBaptismDetails(record: BaptismSummaryRecord): void {
    this.selectedDeathRecord.set(null);
    this.selectedBaptismRecord.set(record);
  }

  openDeathDetails(record: DeathSummaryRecord): void {
    this.selectedBaptismRecord.set(null);
    this.selectedDeathRecord.set(record);
  }

  closePersonDetails(): void {
    this.selectedBaptismRecord.set(null);
    this.selectedDeathRecord.set(null);
  }

  baptismRecordName(record: BaptismSummaryRecord): string {
    return [
      record.first_name,
      record.middle_name,
      record.last_name,
      record.extension_name
    ].filter(Boolean).join(' ');
  }

  onDepartmentChange(event: Event): void {
    const rawValue = (event.target as HTMLSelectElement).value;
    const departmentId = rawValue ? Number(rawValue) : null;
    if (
      departmentId !== null &&
      (!Number.isInteger(departmentId) ||
        !this.departments().some(department => department.department_id === departmentId))
    ) {
      return;
    }

    this.selectedDepartmentId.set(departmentId);
    this.selectedReportId.set(null);
    this.departmentDetails.set(null);
    this.departmentDetailsErrorMessage.set('');
    this.closeReportRecords();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { department_id: departmentId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadDepartmentDetails();
  }

  onReportChange(event: Event): void {
    const reportId = Number((event.target as HTMLSelectElement).value);
    if (!this.selectedDepartmentSummary()?.reports.some(report => report.program_id === reportId)) {
      return;
    }

    this.selectedReportId.set(reportId);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { report_id: reportId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  retryDepartmentDetails(): void {
    this.loadDepartmentDetails();
  }

  backToReports(): void {
    const portalPrefix = this.isAssistantPortal ? '/assistant' : '/director';
    void this.router.navigate([`${portalPrefix}/reports`], {
      queryParams: { year: this.selectedYear() }
    });
  }

  private loadDepartments(): void {
    this.loadingDepartments.set(true);
    this.departmentsErrorMessage.set('');
    this.churchService.getDepartments().subscribe({
      next: response => {
        if (!response?.success || !Array.isArray(response.data)) {
          this.departments.set([]);
          this.departmentsErrorMessage.set('Unable to load departments.');
          this.loadingDepartments.set(false);
          return;
        }

        this.departments.set(response.data);
        const requestedDepartmentId = Number(
          this.route.snapshot.queryParamMap.get('department_id')
        );
        if (
          Number.isInteger(requestedDepartmentId) &&
          this.departments().some(department => department.department_id === requestedDepartmentId)
        ) {
          this.selectedDepartmentId.set(requestedDepartmentId);
          this.loadDepartmentDetails();
        }
        this.loadingDepartments.set(false);
      },
      error: error => {
        console.error('Failed to load report summary departments:', error);
        this.departments.set([]);
        this.departmentsErrorMessage.set('Unable to load departments. Check your connection and try again.');
        this.loadingDepartments.set(false);
      }
    });
  }

  private loadDepartmentDetails(): void {
    const departmentId = this.selectedDepartmentId();
    if (departmentId === null) {
      this.departmentDetails.set(null);
      this.loadingDepartmentDetails.set(false);
      return;
    }

    const requestedYear = this.selectedYear();
    this.loadingDepartmentDetails.set(true);
    this.departmentDetailsErrorMessage.set('');
    this.churchService.getMissionReportSummary(requestedYear, departmentId).subscribe({
      next: response => {
        if (
          requestedYear !== this.selectedYear() ||
          departmentId !== this.selectedDepartmentId()
        ) {
          return;
        }
        if (!response?.success || !response.data) {
          this.departmentDetails.set(null);
          this.departmentDetailsErrorMessage.set('Unable to load report particulars for this department.');
          this.loadingDepartmentDetails.set(false);
          return;
        }

        this.departmentDetails.set(response.data);
        const reports = response.data.departments[0]?.reports ?? [];
        const requestedReportId = Number(
          this.route.snapshot.queryParamMap.get('report_id')
        );
        const selectedReport = reports.find(report =>
          report.program_id === requestedReportId
        ) ?? reports[0];
        this.selectedReportId.set(selectedReport?.program_id ?? null);
        this.loadingDepartmentDetails.set(false);
      },
      error: error => {
        if (
          requestedYear !== this.selectedYear() ||
          departmentId !== this.selectedDepartmentId()
        ) {
          return;
        }
        console.error('Failed to load department report particulars:', error);
        this.departmentDetails.set(null);
        this.departmentDetailsErrorMessage.set('Unable to load report particulars for this department.');
        this.loadingDepartmentDetails.set(false);
      }
    });
  }

  private loadBaptismRecords(): void {
    const quarter = this.selectedRecordQuarter();
    if (!this.isBaptismDepartmentSelected || quarter === null) {
      return;
    }

    const requestedYear = this.selectedYear();
    const requestedDepartmentId = this.selectedDepartmentId();
    this.loadingBaptismRecords.set(true);
    this.baptismRecordsErrorMessage.set('');
    this.churchService.getBaptismRecordsForQuarter(requestedYear, quarter).subscribe({
      next: response => {
        if (
          requestedYear !== this.selectedYear() ||
          quarter !== this.selectedRecordQuarter() ||
          requestedDepartmentId !== this.selectedDepartmentId()
        ) {
          return;
        }
        if (!response?.success || !Array.isArray(response.data)) {
          this.baptismRecords.set([]);
          this.baptismRecordsErrorMessage.set('Unable to load baptism records for this quarter.');
          this.loadingBaptismRecords.set(false);
          return;
        }

        this.baptismRecords.set(response.data);
        this.loadingBaptismRecords.set(false);
      },
      error: error => {
        if (
          requestedYear !== this.selectedYear() ||
          quarter !== this.selectedRecordQuarter() ||
          requestedDepartmentId !== this.selectedDepartmentId()
        ) {
          return;
        }
        console.error('Failed to load baptism records for report summary:', error);
        this.baptismRecords.set([]);
        this.baptismRecordsErrorMessage.set('Unable to load baptism records for this quarter.');
        this.loadingBaptismRecords.set(false);
      }
    });
  }

  private loadDeathRecords(): void {
    const quarter = this.selectedRecordQuarter();
    if (!this.isDeathDepartmentSelected || quarter === null) {
      return;
    }

    const requestedYear = this.selectedYear();
    const requestedDepartmentId = this.selectedDepartmentId();
    this.loadingDeathRecords.set(true);
    this.deathRecordsErrorMessage.set('');
    this.churchService.getDeathRecordsForQuarter(requestedYear, quarter).subscribe({
      next: response => {
        if (
          requestedYear !== this.selectedYear() ||
          quarter !== this.selectedRecordQuarter() ||
          requestedDepartmentId !== this.selectedDepartmentId()
        ) {
          return;
        }
        if (!response?.success || !Array.isArray(response.data)) {
          this.deathRecords.set([]);
          this.deathRecordsErrorMessage.set('Unable to load death records for this quarter.');
          this.loadingDeathRecords.set(false);
          return;
        }

        this.deathRecords.set(response.data);
        this.loadingDeathRecords.set(false);
      },
      error: error => {
        if (
          requestedYear !== this.selectedYear() ||
          quarter !== this.selectedRecordQuarter() ||
          requestedDepartmentId !== this.selectedDepartmentId()
        ) {
          return;
        }
        console.error('Failed to load death records for report summary:', error);
        this.deathRecords.set([]);
        this.deathRecordsErrorMessage.set('Unable to load death records for this quarter.');
        this.loadingDeathRecords.set(false);
      }
    });
  }

  private loadSelectedRecords(): void {
    if (this.isBaptismDepartmentSelected) {
      this.loadBaptismRecords();
    } else if (this.isDeathDepartmentSelected) {
      this.loadDeathRecords();
    }
  }

  deathRecordName(record: DeathSummaryRecord): string {
    return [
      record.first_name,
      record.middle_name,
      record.last_name,
      record.extension_name
    ].filter(Boolean).join(' ');
  }

  loadSummary(): void {
    if (!this.isAssistantPortal && this.assignedDepartmentId === null) {
      this.summary.set(null);
      this.errorMessage.set('A department must be assigned to your Director account.');
      this.loading.set(false);
      return;
    }

    const requestedYear = this.selectedYear();
    this.loading.set(true);
    this.errorMessage.set('');

    this.churchService.getMissionReportSummary(requestedYear).subscribe({
      next: response => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        if (!response?.success || !response.data) {
          this.summary.set(null);
          this.errorMessage.set('Unable to load the mission-wide report summary.');
          this.loading.set(false);
          return;
        }

        this.summary.set(response.data);
        this.loading.set(false);
      },
      error: error => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        console.error('Failed to load the mission-wide report summary:', error);
        this.summary.set(null);
        this.errorMessage.set('Unable to load the mission-wide report summary.');
        this.loading.set(false);
      }
    });
  }
}
