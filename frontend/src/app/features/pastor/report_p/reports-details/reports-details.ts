import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import { Department } from '../../../../core/models/report.model';
import { ReportService } from '../../../../core/services/report/report';

@Component({
  selector: 'app-reports-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-details.html',
  styleUrl: './reports-details.css'
})
export class ReportsDetails implements OnInit {

  private router = inject(Router);
  private churchService = inject(ChurchService);
  private reportService = inject(ReportService);

  readonly districtId = signal(0);
  readonly districtName = signal('');
  readonly district = signal<Church | null>(null);
  readonly churches = signal<Church[]>([]);
  readonly loadingChurches = signal(false);
  readonly errorMessage = signal('');
  readonly expandedChurchId = signal<number | null>(null);
  readonly departmentsByChurch = signal<Record<number, Department[]>>({});
  readonly loadingDepartments = signal<Record<number, boolean>>({});
  readonly departmentErrors = signal<Record<number, string>>({});
  private readonly personalReportDepartmentIds = new Set([16, 20, 22, 23]);
  readonly quarterKeys = ['q1', 'q2', 'q3', 'q4'] as const;

  ngOnInit(): void {
    this.loadChurches();
  }

  loadChurches(): void {
    this.errorMessage.set('');
    this.loadingChurches.set(true);

    this.churchService.getMyDistrictChurches().subscribe({
      next: response => {
        this.district.set(response.district ?? null);
        this.districtId.set(response.district?.church_id ?? 0);
        this.districtName.set(response.district?.name ?? '');
        this.churches.set(Array.isArray(response.data) ? response.data : []);
        this.loadingChurches.set(false);
      },
      error: error => {
        console.error('[REPORT DETAILS] API error:', error);
        this.churches.set([]);
        this.district.set(null);
        this.loadingChurches.set(false);
        this.errorMessage.set(
          error.status === 401
            ? 'Your session has expired. Please log in again.'
            : 'Unable to load your district churches.'
        );
      }
    });
  }

  openDepartmentReports(): void {

    this.router.navigate(
      ['/pastor/reports/programs'],
      {
        queryParams: {
          district_id: this.districtId(),
          district_name: this.districtName()
        }
      }
    );

  }

  openPersonalReport(): void {
    this.router.navigate(['/pastor/baptism']);
  }

  toggleChurch(churchId: number): void {
    if (this.expandedChurchId() === churchId) {
      this.expandedChurchId.set(null);
      return;
    }

    this.expandedChurchId.set(churchId);

    if (
      Object.hasOwn(this.departmentsByChurch(), churchId)
      || this.loadingDepartments()[churchId]
    ) {
      return;
    }

    this.loadDepartments(churchId);
  }

  isChurchOpen(churchId: number): boolean {
    return this.expandedChurchId() === churchId;
  }

  loadDepartments(churchId: number): void {
    this.loadingDepartments.update(current => ({ ...current, [churchId]: true }));
    this.departmentErrors.update(current => {
      const next = { ...current };
      delete next[churchId];
      return next;
    });

    this.reportService.getDepartments(churchId).subscribe({
      next: response => {
        this.departmentsByChurch.update(current => ({
          ...current,
          [churchId]: Array.isArray(response) ? response : []
        }));
        this.loadingDepartments.update(current => ({ ...current, [churchId]: false }));
      },
      error: error => {
        this.loadingDepartments.update(current => ({ ...current, [churchId]: false }));
        this.departmentErrors.update(current => ({
          ...current,
          [churchId]: error?.error?.message || 'Unable to load departments for this church.'
        }));
      }
    });
  }

  getReportDepartments(churchId: number): Department[] {
    return (this.departmentsByChurch()[churchId] ?? []).filter(
      department => !this.isPersonalReportDepartment(department)
    );
  }

  private isPersonalReportDepartment(department: Department): boolean {
    const name = String(department.department_name || '').trim().toLowerCase();

    return this.personalReportDepartmentIds.has(Number(department.department_id))
      || name.includes('adventist mission')
      || name.includes('ministerial')
      || name.includes('baptism record')
      || name.includes('death record');
  }

  hasDepartmentData(
    department: Department,
    quarter: 'q1' | 'q2' | 'q3' | 'q4'
  ): boolean {
    const hasSubmittedData = {
      q1: department.q1_submitted_data_progress,
      q2: department.q2_submitted_data_progress,
      q3: department.q3_submitted_data_progress,
      q4: department.q4_submitted_data_progress
    }[quarter];
    const progress = {
      q1: department.q1_data_progress,
      q2: department.q2_data_progress,
      q3: department.q3_data_progress,
      q4: department.q4_data_progress
    }[quarter];
    const submitted = {
      q1: department.q1_submitted,
      q2: department.q2_submitted,
      q3: department.q3_submitted,
      q4: department.q4_submitted
    }[quarter];

    return Boolean(submitted) || (hasSubmittedData ?? 0) > 0 || (progress ?? 0) > 0;
  }

  isDepartmentApproved(
    department: Department,
    quarter: 'q1' | 'q2' | 'q3' | 'q4'
  ): boolean {
    return Boolean({
      q1: department.q1_approved,
      q2: department.q2_approved,
      q3: department.q3_approved,
      q4: department.q4_approved
    }[quarter]);
  }

  trackDepartment(index: number, department: Department): number {
    return department.department_id || index;
  }

  openDepartment(department: Department): void {
    if (!department?.department_id) {
      return;
    }

    const departmentName = String(department.department_name || '').toLowerCase();
    const isBaptismOrDeath = department.department_id === 22
      || department.department_id === 23
      || departmentName.includes('baptism')
      || departmentName.includes('death');

    if (isBaptismOrDeath) {
      this.router.navigate(['/pastor/deathbap']);
      return;
    }

    this.router.navigate([
      '/pastor/reports/particulars',
      department.department_id,
      this.districtId(),
      this.expandedChurchId()
    ]);
  }

}