import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ReportService } from '../../../../core/services/report/report';

import {
  Department,
  ChurchesResponse,
  DepartmentReport,
  ReportQuarter
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
  loading = false;
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

  // Load departments, then load the monitoring for each one
  private loadDepartments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.reportService.getDepartments(this.churchId).subscribe({
      next: (departments: Department[]) => {
        this.departments = departments;
        this.loading = false;
        this.cdr.detectChanges();

        this.loadMonitoring();
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

  // department_id -> { q1, q2, q3, q4 }
  private monitoring: Record<number, Monitoring> = {};

  private readonly emptyMonitoring: Monitoring = {
    q1: null,
    q2: null,
    q3: null,
    q4: null
  };

  // Used by the template: getMonitoring(i).q1 ... q4
  getMonitoring(index: number): Monitoring {
    const department = this.representativeDepartments[index];

    return (department && this.monitoring[department.department_id])
      || this.emptyMonitoring;
  }

  // Load every department's saved report in one go
  private loadMonitoring(): void {
    const departments = this.representativeDepartments;

    if (departments.length === 0) {
      return;
    }

    const requests = departments.map(department =>
      this.reportService
        .getDepartmentReport(this.churchId, department.department_id)
        .pipe(
          map(report => this.buildMonitoring(report)),
          catchError(() => of(this.emptyMonitoring))
        )
    );

    forkJoin(requests).subscribe(results => {
      departments.forEach((department, i) => {
        this.monitoring[department.department_id] = results[i];
      });

      this.cdr.detectChanges();
    });
  }

  // Rules per quarter:
  //   approved by the mission      -> 100  (shows the green check)
  //   some particulars have values -> % filled, capped at 99 until approved
  //   nothing entered / no quarter -> null (shows the dash)
  private buildMonitoring(report: DepartmentReport): Monitoring {
    // Collect every quarter record of every particular
    const records: ReportQuarter[] = [];

    for (const program of report.programs ?? []) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          records.push(...(particular.quarters ?? []));
        }
      }
    }

    if (records.length === 0) {
      return this.emptyMonitoring;
    }

    // Only use the latest year
    const latestYear = Math.max(...records.map(q => Number(q.year)));
    const current = records.filter(q => Number(q.year) === latestYear);

    const percentFor = (quarterNumber: number): number | null => {
      const items = current.filter(
        q => this.getQuarterNumber(q.quarter) === quarterNumber
      );

      if (items.length === 0) {
        return null;
      }

      if (items.every(q => !!q.mission_approve)) {
        return 100;
      }

      const filled = items.filter(
        q => q.value !== null && q.value !== undefined
      ).length;

      if (filled === 0) {
        return null;
      }

      return Math.min(99, Math.round((filled / items.length) * 100));
    };

    return {
      q1: percentFor(1),
      q2: percentFor(2),
      q3: percentFor(3),
      q4: percentFor(4)
    };
  }

  // "Q1" / "Quarter 1" -> 1
  private getQuarterNumber(quarter: string): number {
    const value = String(quarter).toUpperCase();

    if (value.includes('1')) return 1;
    if (value.includes('2')) return 2;
    if (value.includes('3')) return 3;
    if (value.includes('4')) return 4;

    return 99;
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