import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  ReportService
} from '../../../../core/services/report/report';

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

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly reportService =
    inject(ReportService);

  readonly cdr =
    inject(ChangeDetectorRef);


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

  selectedDepartment:
    Department | null = null;


  // =====================================================
  // REPORT
  // =====================================================

  departmentReport:
    DepartmentReport | null = null;


  // =====================================================
  // LOADING
  // =====================================================

  loadingDepartments = false;

  loadingReport = false;

  loadingComments = false;

  savingComment = false;


  // =====================================================
  // ERROR
  // =====================================================

  errorMessage = '';


  // =====================================================
  // COMMENTS
  // =====================================================

  comments: ReportComment[] = [];

  newComment = '';

  // Temporary current user
  currentUserId = 1;


  // =====================================================
  // CURRENT REPORTING QUARTER
  // =====================================================

  /*
   * IMPORTANT:
   * The organization's current reporting quarter
   * is Q3 2026.
   *
   * We do NOT calculate this from the computer date.
   */

  currentQuarter = 'Q3';

  currentQuarterId = 0;

  currentQuarterReport:
    ReportQuarter | null = null;


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.route.queryParamMap.subscribe(
      params => {

        this.districtId =
          Number(
            params.get('district_id')
          ) || 0;

        this.districtName =
          params.get('district_name') || '';

        this.churchId =
          Number(
            params.get('church_id')
          ) || 0;

        this.churchName =
          params.get('church_name') || '';


        if (!this.churchId) {

          this.errorMessage =
            'Church ID was not provided.';

          this.cdr.detectChanges();

          return;
        }


        this.loadDepartments();

      }
    );

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

        next: departments => {

          this.departments =
            Array.isArray(departments)
              ? departments
              : [];

          this.loadingDepartments = false;

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load departments:',
            error
          );


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

  openDepartment(
    department: Department
  ): void {

    this.selectedDepartment =
      department;

    this.departmentReport = null;

    this.comments = [];

    this.newComment = '';

    this.currentQuarterId = 0;

    this.currentQuarterReport =
      null;

    this.errorMessage = '';

    this.loadingReport = true;


    this.loadDepartmentReport(
      department.department_id
    );

  }


  // =====================================================
  // LOAD DEPARTMENT REPORT
  // =====================================================

  loadDepartmentReport(
    departmentId: number
  ): void {

    this.loadingReport = true;

    this.errorMessage = '';


    this.reportService
      .getDepartmentReport(
        this.churchId,
        departmentId
      )
      .subscribe({

        next: report => {

          this.departmentReport =
            report;

          this.loadingReport = false;


          // Find Q3 2026
          this.findCurrentQuarter();


          // Load comments for Q3 2026
          this.loadComments();


          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load department report:',
            error
          );


          this.departmentReport = null;

          this.loadingReport = false;

          this.comments = [];

          this.currentQuarterId = 0;

          this.currentQuarterReport =
            null;


          this.errorMessage =
            error?.error?.message ||
            'Unable to load department report.';


          this.cdr.detectChanges();

        }

      });

  }


  // =====================================================
  // FIND CURRENT QUARTER
  // =====================================================

  findCurrentQuarter(): void {

    this.currentQuarterId = 0;

    this.currentQuarterReport =
      null;


    if (!this.departmentReport) {

      return;

    }


    const currentYear =
      this.getCurrentYear();


    for (
      const program
      of this.departmentReport.programs
    ) {

      for (
        const section
        of program.sections
      ) {

        for (
          const particular
          of section.particulars
        ) {

          const report =
            particular.quarters.find(
              q =>
                q.quarter ===
                  this.currentQuarter &&
                String(q.year) ===
                  currentYear
            );


          if (report) {

            this.currentQuarterId =
              Number(
                report.quarter_id
              );

            this.currentQuarterReport =
              report;

            return;

          }

        }

      }

    }

  }


  // =====================================================
  // CHECK CURRENT QUARTER
  // =====================================================

  hasCurrentQuarter(): boolean {

    return (
      this.currentQuarterId > 0
    );

  }


  // =====================================================
  // CHECK APPROVAL
  // =====================================================

  isCurrentQuarterApproved(): boolean {

    return !!this
      .currentQuarterReport
      ?.mission_approve;

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
      .getComments(
        this.currentQuarterId
      )
      .subscribe({

        next: comments => {

          this.comments =
            Array.isArray(comments)
              ? comments
              : [];

          this.loadingComments = false;

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load comments:',
            error
          );


          this.comments = [];

          this.loadingComments = false;

          this.cdr.detectChanges();

        }

      });

  }


  // =====================================================
  // PUBLISH COMMENT
  // =====================================================

  publishComment(): void {

    const details =
      this.newComment.trim();


    // Empty comment
    if (!details) {

      return;

    }


    // No Q3 2026 report
    if (!this.currentQuarterId) {

      this.errorMessage =
        'No Q3 2026 report is available for this department.';

      this.cdr.detectChanges();

      return;

    }


    // Already approved
    if (
      this.isCurrentQuarterApproved()
    ) {

      this.errorMessage =
        'This Q3 2026 report has already been approved. No more comments are allowed.';

      this.cdr.detectChanges();

      return;

    }


    // Prevent duplicate clicks
    if (this.savingComment) {

      return;

    }


    this.savingComment = true;

    this.errorMessage = '';


    this.reportService
      .addComment(
        this.currentQuarterId,
        this.churchId,
        Number(this.selectedDepartment?.department_id),
        details
      )
      .subscribe({

        next: response => {
          this.comments.unshift(response.data);


          this.newComment = '';

          this.savingComment = false;

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Unable to save comment:',
            error
          );


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
      particular.quarters.find(
        q =>
          q.quarter === quarter
      ) || null
    );

  }


  // =====================================================
  // GET QUARTER VALUE
  // =====================================================

  getQuarterValue(
    particular: Particular,
    quarter: string
  ): number | string {

    const report =
      this.getQuarterReport(
        particular,
        quarter
      );


    if (!report) {

      return '—';

    }


    if (
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

  getTotal(
    particular: Particular
  ): number {

    return particular.quarters
      .reduce(
        (
          total,
          report
        ) => {

          const value =
            Number(
              report.value
            );


          if (
            Number.isNaN(value)
          ) {

            return total;

          }


          return total + value;

        },

        0
      );

  }


  // =====================================================
  // APPROVED
  // =====================================================

  isApproved(
    particular: Particular,
    quarter: string
  ): boolean {

    const report =
      this.getQuarterReport(
        particular,
        quarter
      );


    return !!report?.mission_approve;

  }


  // =====================================================
  // ENDORSED
  // =====================================================

  isEndorsed(
    particular: Particular,
    quarter: string
  ): boolean {

    const report =
      this.getQuarterReport(
        particular,
        quarter
      );


    return !!report?.district_endorse &&
      !report?.mission_approve;

  }


  // =====================================================
  // SUBMITTED
  // =====================================================

  isSubmitted(
    particular: Particular,
    quarter: string
  ): boolean {

    const report =
      this.getQuarterReport(
        particular,
        quarter
      );


    return !!report?.date_submitted;

  }


  // =====================================================
  // BACK TO DEPARTMENTS
  // =====================================================

  backToDepartments(): void {

    this.selectedDepartment =
      null;

    this.departmentReport =
      null;

    this.comments = [];

    this.newComment = '';

    this.currentQuarterId = 0;

    this.currentQuarterReport =
      null;

    this.errorMessage = '';

    this.cdr.detectChanges();

  }


  // =====================================================
  // BACK TO REPORT DETAILS
  // =====================================================

  backToReportDetails(): void {

    this.router.navigate(
      [
        '/pastor/reports/details',
        this.districtId
      ]
    );

  }

}