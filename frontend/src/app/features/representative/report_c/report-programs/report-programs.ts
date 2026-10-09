import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ReportService } from '../../../../core/services/report/report';

import {
  Department,
  ChurchesResponse
} from '../../../../core/models/report.model';

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

  // Load church (uses the district endpoint to find the representative's church)
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
        // Keep a default name if the request fails
        this.churchName = 'Church Representative';
        this.cdr.detectChanges();
      });
  }

  // Load departments
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

  // Filtered list used by the template
  get representativeDepartments(): Department[] {
    return this.departments.filter(department =>
      this.isRepresentativeReport(department)
    );
  }

  // Open department
  openDepartment(department: Department): void {
    if (!department || !department.department_id) {
      return;
    }

    this.router.navigate([
      '/representative/reports/particulars',
      department.department_id
    ]);
  }

  // Back
  backToReports(): void {
    this.router.navigate(['/representative/reports']);
  }

  trackDepartment(index: number, department: Department): number {
    return department.department_id;
  }

  // Monitoring (mock data, one row per department)
  private monitoring = [
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null },
    { q1: 100, q2: 100, q3: 50, q4: null }
  ];

  getMonitoring(index: number) {
    return this.monitoring[index % this.monitoring.length];
  }
}