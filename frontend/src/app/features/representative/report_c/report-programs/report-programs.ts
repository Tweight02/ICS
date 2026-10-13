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

import {
  Department,
  ChurchesResponse
} from '../../../../core/models/report.model';

interface Monitoring {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Current user
  private readonly CURRENT_USER = {
    user_id: 1,
    department_id: 1,
    church_id: 214,
    first_name: 'Juan',
    middle_name: 'Santos',
    last_name: 'Dela Cruz',
    extension_name: null,
    birthdate: '1980-05-15',
    gender: 'Male',
    email: 'district.representative@example.com',
    role: 'representative'
  };

  // District
  readonly districtId = 210;
  readonly districtName = 'Eastern Nueva Vizcaya';

  // Church
  churchId = this.CURRENT_USER.church_id;
  churchName = 'Church';
  churchAddress = '';

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
    this.loadChurch();
    this.loadDepartments();
  }

  // Load church
  private loadChurch(): void {
    fetch(`http://127.0.0.1:8000/api/districts/${this.districtId}/churches`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Unable to load churches.');
        }
        return response.json();
      })
      .then((response: ChurchesResponse) => {
        const churches = response.data || [];

        const currentChurch = churches.find(
          church => Number(church.church_id) === Number(this.churchId)
        );

        if (currentChurch) {
          this.churchName = currentChurch.name;
          this.churchAddress = currentChurch.address || '';
        }

        this.cdr.detectChanges();
      })
      .catch(() => {
        this.churchName = 'Church Representative';
        this.cdr.detectChanges();
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
    const excludedReports = ['baptism', 'death'];

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
    q1: null,
    q2: null,
    q3: null,
    q4: null
  };

  getMonitoring(index: number): Monitoring {
    const department = this.representativeDepartments[index];

    if (!department) {
      return this.emptyMonitoring;
    }

    return {
      q1: department.q1_approved ? 100 : null,
      q2: department.q2_approved ? 100 : null,
      q3: department.q3_approved ? 100 : null,
      q4: department.q4_approved ? 100 : null
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