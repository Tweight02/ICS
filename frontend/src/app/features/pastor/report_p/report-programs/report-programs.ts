
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ReportService } from '../../../../core/services/report/report';
import { AuthService } from '../../../../core/services/auth/auth-service';

import {
  Department,
  DepartmentReport,
  Particular,
  ReportQuarter,
  ReportComment
} from '../../../../core/models/report.model';

@Component({
  selector: 'app-report-programs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './report-programs.html',
  styleUrl: './report-programs.css'
})
export class ReportPrograms implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportService = inject(ReportService);
  readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);

  // =====================================================
  // DISTRICT / CHURCH
  // =====================================================

  districtId = 0;
  districtName = '';
  churchId = 0;
  churchName = '';

  // =====================================================
  // DEPARTMENTS
  // =====================================================

  departments: Department[] = [];
  selectedDepartment: Department | null = null;

  // =====================================================
  // REPORT
  // =====================================================

  departmentReport: DepartmentReport | null = null;

  // =====================================================
  // LOADING
  // =====================================================

  loadingDepartments = false;
  loadingReport = false;
  loadingComments = false;
  savingComment = false;

  // =====================================================
  // ERROR / SUCCESS
  // =====================================================

  errorMessage = '';
  successMessage = '';

  // =====================================================
  // AUTHENTICATED USER
  // =====================================================

  currentUserId = 0;
  currentUserRole = 'User';

  // =====================================================
  // COMMENTS
  // =====================================================

  comments: ReportComment[] = [];
  newComment = '';

  // =====================================================
  // CURRENT REPORTING QUARTER
  // =====================================================

  // Organization reporting quarter is fixed to Q3 2026.
  currentQuarter = 'Q3';
  currentQuarterId = 0;
  currentQuarterReport: ReportQuarter | null = null;

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();

    if (!user) {
      this.errorMessage =
        'Unable to identify the logged-in user. Please sign in again.';
      this.cdr.detectChanges();
      return;
    }

    this.currentUserId = Number(user.user_id);

    if (
      !Number.isFinite(this.currentUserId) ||
      this.currentUserId <= 0
    ) {
      this.errorMessage = 'Invalid logged-in user ID.';
      this.cdr.detectChanges();
      return;
    }

    const roleLabels: Record<string, string> = {
      pastor: 'District Pastor',
      assistant: 'Administrative Assistant',
      director: 'Director',
      representative: 'Representative',
      events: 'Events'
    };

    this.currentUserRole =
      roleLabels[user.role] ?? 'User';

    this.route.queryParamMap.subscribe(params => {
      this.districtId =
        Number(params.get('district_id')) || 0;

      this.districtName =
        params.get('district_name') || '';

      this.churchId =
        Number(params.get('church_id')) || 0;

      this.churchName =
        params.get('church_name') || '';

      if (!this.churchId) {
        this.errorMessage = 'Church ID was not provided.';
        this.cdr.detectChanges();
        return;
      }

      this.loadDepartments();
    });
  }

  // =====================================================
  // CURRENT YEAR
  // =====================================================

  getCurrentYear(): string {
    return '2026';
  }

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.errorMessage = '';
    this.departments = [];
    this.selectedDepartment = null;
    this.departmentReport = null;

    this.reportService
      .getDepartments(this.churchId)
      .subscribe({
        next: (response: any) => {
          const data = response?.data ?? response;

          this.departments = Array.isArray(data)
            ? data
            : [];

          this.loadingDepartments = false;
          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('Unable to load departments:', error);

          this.departments = [];
          this.loadingDepartments = false;
          this.errorMessage =
            error?.error?.message ||
            'Unable to load departments.';

          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // OPEN DEPARTMENT
  // =====================================================

  openDepartment(department: Department): void {
    this.selectedDepartment = department;
    this.departmentReport = null;
    this.comments = [];
    this.newComment = '';
    this.currentQuarterId = 0;
    this.currentQuarterReport = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.loadingReport = true;

    this.loadDepartmentReport(department.department_id);
  }

  // =====================================================
  // LOAD DEPARTMENT REPORT
  // =====================================================

  loadDepartmentReport(departmentId: number): void {
    this.loadingReport = true;
    this.errorMessage = '';

    this.reportService
      .getDepartmentReport(this.churchId, departmentId)
      .subscribe({
        next: (response: any) => {
          this.departmentReport =
            (response?.data ?? response) as DepartmentReport;

          this.loadingReport = false;

          this.findCurrentQuarter();
          this.loadComments();

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('Unable to load department report:', error);

          this.departmentReport = null;
          this.loadingReport = false;
          this.comments = [];
          this.currentQuarterId = 0;
          this.currentQuarterReport = null;

          this.errorMessage =
            error?.error?.message ||
            'Unable to load department report.';

          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // FIND Q3 2026
  // =====================================================

  findCurrentQuarter(): void {
    this.currentQuarterId = 0;
    this.currentQuarterReport = null;

    if (!this.departmentReport) {
      return;
    }

    const currentYear = this.getCurrentYear();

    for (const program of this.departmentReport.programs ?? []) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          const report = (particular.quarters ?? []).find(q =>
            String(q.quarter).toUpperCase() === this.currentQuarter &&
            String(q.year) === currentYear
          );

          if (report) {
            this.currentQuarterId = Number(report.quarter_id);
            this.currentQuarterReport = report;
            return;
          }
        }
      }
    }
  }

  // =====================================================
  // CURRENT QUARTER STATUS
  // =====================================================

  hasCurrentQuarter(): boolean {
    return this.currentQuarterId > 0;
  }

  isApprovedValue(value: unknown): boolean {
    return ['1', 'true', 'approved'].includes(
      String(value ?? '').trim().toLowerCase()
    );
  }

  isCurrentQuarterApproved(): boolean {
    return this.isApprovedValue(
      this.currentQuarterReport?.mission_approve
    );
  }

  // =====================================================
  // LOAD COMMENTS
  // =====================================================

  loadComments(): void {
    if (!this.currentQuarterId) {
      this.comments = [];
      this.loadingComments = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingComments = true;

    this.reportService
      .getComments(this.currentQuarterId)
      .subscribe({
        next: (response: any) => {
          const data = response?.data ?? response;

          this.comments = Array.isArray(data)
            ? data
            : [];

          this.loadingComments = false;
          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('Unable to load comments:', error);

          this.comments = [];
          this.loadingComments = false;

          this.errorMessage =
            error?.error?.message ||
            'Unable to load comments.';

          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // PUBLISH COMMENT
  // =====================================================

  publishComment(): void {
    const details = this.newComment.trim();

    if (!details) {
      return;
    }

    if (details.length > 255) {
      this.errorMessage =
        'Comments must not exceed 255 characters.';
      return;
    }

    if (!this.currentQuarterId) {
      this.errorMessage =
        'No Q3 2026 report is available for this department.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isCurrentQuarterApproved()) {
      this.errorMessage =
        'This Q3 2026 report has already been approved. No more comments are allowed.';
      this.cdr.detectChanges();
      return;
    }

    if (this.savingComment) {
      return;
    }

    if (!this.currentUserId) {
      this.errorMessage =
        'Unable to identify the logged-in user. Please sign in again.';
      this.cdr.detectChanges();
      return;
    }

    this.savingComment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.reportService
      .addComment(
        this.currentQuarterId,
        this.currentUserId,
        details
      )
      .subscribe({
        next: (response: any) => {
          const comment = response?.data ?? response;

          if (comment) {
            this.comments.unshift(comment as ReportComment);
          }

          this.newComment = '';
          this.savingComment = false;
          this.successMessage = 'Comment published successfully.';

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('Unable to save comment:', error);

          this.savingComment = false;
          this.errorMessage =
            error?.error?.message ||
            'Unable to save comment.';

          this.cdr.detectChanges();
        }
      });
  }

  // =====================================================
  // GET QUARTER REPORT
  // =====================================================

  getQuarterReport(
    particular: Particular,
    quarter: string
  ): ReportQuarter | null {
    return (
      particular.quarters?.find(q =>
        String(q.quarter).toUpperCase() ===
        String(quarter).toUpperCase()
      ) ?? null
    );
  }

  // =====================================================
  // GET QUARTER VALUE
  // =====================================================


getQuarterValue(
  particular: Particular,
  quarter: string
): number | string {
  const report = this.getQuarterReport(particular, quarter);

  if (
    !report ||
    report.value === null ||
    report.value === undefined
  ) {
    return '—';
  }

  return report.value;
}

  // =====================================================
  // TOTAL
  // =====================================================


getTotal(particular: Particular): number {
  return (particular.quarters ?? []).reduce((total, report) => {
    if (
      report.value === null ||
      report.value === undefined
    ) {
      return total;
    }

    const value = Number(report.value);

    return Number.isFinite(value)
      ? total + value
      : total;
  }, 0);
}
  // =====================================================
  // APPROVED
  // =====================================================

  isApproved(
    particular: Particular,
    quarter: string
  ): boolean {
    const report = this.getQuarterReport(particular, quarter);

    return this.isApprovedValue(report?.mission_approve);
  }

  // =====================================================
  // ENDORSED
  // =====================================================

  isEndorsed(
    particular: Particular,
    quarter: string
  ): boolean {
    const report = this.getQuarterReport(particular, quarter);

    return !!report?.district_endorse &&
      !this.isApprovedValue(report?.mission_approve);
  }

  // =====================================================
  // SUBMITTED
  // =====================================================

  isSubmitted(
    particular: Particular,
    quarter: string
  ): boolean {
    const report = this.getQuarterReport(particular, quarter);

    return !!report?.date_submitted;
  }

  // =====================================================
  // BACK TO DEPARTMENTS
  // =====================================================

  backToDepartments(): void {
    this.selectedDepartment = null;
    this.departmentReport = null;
    this.comments = [];
    this.newComment = '';
    this.currentQuarterId = 0;
    this.currentQuarterReport = null;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  // =====================================================
  // BACK TO REPORT DETAILS
  // =====================================================

  backToReportDetails(): void {
    this.router.navigate(
      ['/pastor/reports/details', this.districtId]
    );
  }
}