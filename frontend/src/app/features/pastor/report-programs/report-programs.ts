import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ReportService,
  Department,
  DepartmentReport,
  Particular
} from '../../../core/services/report/report';

interface ReportComment {
  author: string;
  role: string;
  date: string;
  text: string;
}

@Component({
  selector: 'app-report-programs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-programs.html',
  styleUrl: './report-programs.css'
})
export class ReportPrograms implements OnInit {

  private reportService = inject(ReportService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  districtId = 0;
  districtName = '';

  departments: Department[] = [];
  selectedDepartment: Department | null = null;
  departmentReport: DepartmentReport | null = null;

  loadingDepartments = false;
  loadingReport = false;
  errorMessage = '';

  // Comments
  comments: ReportComment[] = [];
  newComment = '';

  sampleComment: ReportComment = {
    author: 'Administrative Assistant',
    role: 'Administrative Assistant · Sample comment',
    date: '2026-09-15T15:00:00',
    text: 'Sample: The report has been reviewed by the Administrative Assistant. Please ensure the entries are complete and any supporting notes are included before final submission.'
  };

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const districtId = params.get('district_id');

      if (!districtId) {
        this.errorMessage = 'District ID was not provided.';
        return;
      }

      this.districtId = Number(districtId);
      this.districtName = params.get('district_name') || '';

      this.loadDepartments();
    });
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.errorMessage = '';

    this.reportService.getDepartments(this.districtId).subscribe({
      next: (departments) => {
        this.departments = departments || [];
        this.loadingDepartments = false;
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('[REPORT PROGRAMS] Department API error:', error);

        this.departments = [];
        this.loadingDepartments = false;
        this.errorMessage = 'Unable to load departments.';
        this.cdr.detectChanges();
      }
    });
  }

  openDepartment(department: Department): void {
    this.selectedDepartment = department;
    this.departmentReport = null;
    this.loadingReport = true;
    this.errorMessage = '';

    this.loadComments();

    this.reportService
      .getDepartmentReport(this.districtId, department.department_id)
      .subscribe({
        next: (report) => {
          this.departmentReport = report;
          this.loadingReport = false;
          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('[REPORT PROGRAMS] Report API error:', error);

          this.departmentReport = null;
          this.loadingReport = false;
          this.errorMessage = 'Unable to load the department report.';
          this.cdr.detectChanges();
        }
      });
  }

  backToDepartments(): void {
    this.selectedDepartment = null;
    this.departmentReport = null;
    this.errorMessage = '';
    this.comments = [];
    this.newComment = '';
  }

  backToReportDetails(): void {
    this.router.navigate(['/pastor/reports/details'], {
      queryParams: {
        district_id: this.districtId,
        district_name: this.districtName
      }
    });
  }

  // Quarter helpers

  getQuarterReport(particular: Particular, quarter: string) {
    return particular.quarters?.find(item => item.quarter === quarter);
  }

  getQuarterValue(particular: Particular, quarter: string): string | number {
    return this.getQuarterReport(particular, quarter)?.value ?? '';
  }

  getTotal(particular: Particular): number {
    return ['Q1', 'Q2', 'Q3', 'Q4'].reduce((sum, quarter) => {
      return sum + (Number(this.getQuarterReport(particular, quarter)?.value) || 0);
    }, 0);
  }

  isApproved(particular: Particular, quarter: string): boolean {
    return !!this.getQuarterReport(particular, quarter)?.mission_approve;
  }

  isEndorsed(particular: Particular, quarter: string): boolean {
    const report = this.getQuarterReport(particular, quarter);
    return !!report?.district_endorse && !report?.mission_approve;
  }

  isSubmitted(particular: Particular, quarter: string): boolean {
    return !!this.getQuarterReport(particular, quarter)?.date_submitted;
  }

  getQuarterStatus(particular: Particular, quarter: string): string {
    const report = this.getQuarterReport(particular, quarter);

    if (!report) return '';
    if (report.mission_approve) return 'Approved';
    if (report.district_endorse) return 'Endorsed';
    if (report.date_submitted) return 'Submitted';

    return '';
  }

  // Comments (saved in this browser, one list per district + department)

  private getStorageKey(): string {
    return `report_comments_${this.districtId}_${this.selectedDepartment?.department_id}`;
  }

  loadComments(): void {
    const saved = localStorage.getItem(this.getStorageKey());
    this.comments = saved ? JSON.parse(saved) : [];
  }

  onCommentInput(event: Event): void {
    this.newComment = (event.target as HTMLTextAreaElement).value;
  }

  publishComment(): void {
    const text = this.newComment.trim();
    if (!text) return;

    // newest first
    this.comments.unshift({
      author: 'District Pastor',
      role: 'District Pastor',
      date: new Date().toISOString(),
      text
    });

    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.comments));
    this.newComment = '';
  }

  // Monitoring (mock data, one row per department)

  private monitoring = [
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 40, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 60, q4: null },
    { q1: 100, q2: 100, q3: 53, q4: null },
    { q1: 100, q2: 100, q3: 63, q4: null },
    { q1: 100, q2: 100, q3: 60, q4: null },
    { q1: 100, q2: 100, q3: 53, q4: null },
    { q1: 100, q2: 100, q3: 67, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 40, q4: null }
  ];

  getMonitoring(index: number) {
    return this.monitoring[index % this.monitoring.length];
  }
}