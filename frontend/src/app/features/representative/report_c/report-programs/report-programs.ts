import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ReportService } from '../../../../core/services/report/report';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Department } from '../../../../core/models/report.model';

interface QuarterMonitoring {
  progress: number | null;
  approved: boolean;
}

interface Monitoring {
  q1: QuarterMonitoring;
  q2: QuarterMonitoring;
  q3: QuarterMonitoring;
  q4: QuarterMonitoring;
}

@Component({
  selector: 'app-report-programs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-programs.html',
  styleUrls: ['./report-programs.css']
})
export class ReportPrograms implements OnInit {

  private readonly reportService = inject(ReportService);
  private readonly auth = inject(AuthService);
  private readonly churchService = inject(ChurchService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  districtId = 0;
  districtName = '';
  churchId = 0;
  churchName = '';

  // Departments
  departments: Department[] = [];

  // UI state
  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }
  errorMessage = '';

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();

    if (!user?.church_id) {
      this.errorMessage =
        'Your account does not have a church assigned. Please contact the administrator.';
      return;
    }

    this.loadChurchNames(Number(user.church_id));
  }

  private loadChurchNames(assignedChurchId: number): void {
    this.loading = true;

    this.churchService.getAllChurches().subscribe({
      next: response => {
        const churches = Array.isArray(response.data) ? response.data : [];
        const assignedChurch = churches.find(
          item => Number(item.church_id) === assignedChurchId
        );

        if (!assignedChurch) {
          this.loading = false;
          this.errorMessage = 'Your assigned church could not be found.';
          this.cdr.detectChanges();
          return;
        }

        this.districtId = Number(
          assignedChurch.parent_id ?? assignedChurch.church_id
        );
        const district = churches.find(
          item => Number(item.church_id) === this.districtId && item.parent_id === null
        );

        if (!district) {
          this.loading = false;
          this.errorMessage = 'The district for your assigned church could not be found.';
          this.cdr.detectChanges();
          return;
        }

        this.districtName = district.name;

        let reportChurch = assignedChurch;
        if (assignedChurch.parent_id === null) {
          const districtChurches = churches.filter(
            item => Number(item.parent_id) === this.districtId
          );

          if (districtChurches.length !== 1) {
            this.loading = false;
            this.errorMessage = districtChurches.length === 0
              ? 'No local church is assigned to this district.'
              : 'Your account is assigned to a district with multiple churches. Please contact the administrator.';
            this.cdr.detectChanges();
            return;
          }

          reportChurch = districtChurches[0];
        }

        this.churchId = Number(reportChurch.church_id);
        this.churchName = reportChurch.name;
        this.loadDepartments();

        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load church and district names.';
        this.cdr.detectChanges();
      }
    });
  }

  // The department list includes approval summaries for each quarter.
  private loadDepartments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.reportService.getDepartments(this.churchId).subscribe({
      next: (departments: Department[]) => {
        this.departments = departments;
        this.loading = false;
        this.cdr.detectChanges();

      },

      error: (error) => {
        console.error('Unable to load departments:', error);

        this.departments = [];
        this.errorMessage = error?.error?.message || 'Unable to load reports.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Reports the representative does not handle
  isRepresentativeReport(department: Department): boolean {
    const name = String(department.department_name || '').trim().toLowerCase();
    const excludedReports = [
      'baptism',
      'death',
      'ministerial',
      'evangelism',
      'adventist'
    ];

    return !excludedReports.some(excluded => name.includes(excluded));
  }

  get representativeDepartments(): Department[] {
    return this.departments.filter(department =>
      this.isRepresentativeReport(department)
    );
  }

  openDepartment(department: Department): void {
    if (!department || !department.department_id) {
      return;
    }

    this.router.navigate([
      '/representative/reports/particulars',
      department.department_id
    ]);
  }

  trackDepartment(index: number, department: Department): number {
    return department.department_id;
  }


  /* =========================================================
     MONITORING (from the database)
  ========================================================= */

  private readonly emptyMonitoring: Monitoring = {
    q1: { progress: null, approved: false },
    q2: { progress: null, approved: false },
    q3: { progress: null, approved: false },
    q4: { progress: null, approved: false }
  };

  getMonitoring(index: number): Monitoring {
    const department = this.representativeDepartments[index];

    if (!department) {
      return this.emptyMonitoring;
    }

    return {
      q1: { progress: department.q1_data_progress ?? null, approved: !!department.q1_approved },
      q2: { progress: department.q2_data_progress ?? null, approved: !!department.q2_approved },
      q3: { progress: department.q3_data_progress ?? null, approved: !!department.q3_approved },
      q4: { progress: department.q4_data_progress ?? null, approved: !!department.q4_approved }
    };
  }


  // Bootstrap Icons class for each department
  getDepartmentIcon(departmentName: string): string {
    const name = String(departmentName || '').toLowerCase();

    if (name.includes('children')) return 'bi-people-fill';
    if (name.includes('stewardship')) return 'bi-cash-coin';
    if (name.includes('sabbath')) return 'bi-book';
    if (name.includes('ministerial') || name.includes('evangelism')) return 'bi-journal-bookmark';
    if (name.includes('youth')) return 'bi-person-arms-up';
    if (name.includes('women')) return 'bi-gender-female';
    if (name.includes('communication')) return 'bi-chat-dots';
    if (name.includes('mission')) return 'bi-globe-americas';
    if (name.includes('secretariat')) return 'bi-folder2-open';

    return 'bi-file-earmark-text';
  }

  /* =========================================================
     MOCK DATA (kept for later, not used)
  ========================================================= */

  // private monitoring = [
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null },
  //   { q1: 100, q2: 100, q3: 50, q4: null }
  // ];
  //
  // getMonitoring(index: number) {
  //   return this.monitoring[index % this.monitoring.length];
  // }
}