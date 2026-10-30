import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportService } from '../../../../core/services/report/report';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import {
  Department,
  PERSONAL_REPORT_DEPARTMENT_IDS
} from '../../../../core/models/report.model';
import { QuarterStatus, QuarterStatusTone } from '../../../../shared/reports/quarter-status/quarter-status';
import {
  CURRENT_REPORT_YEAR,
  REPORT_YEAR_OPTIONS,
  resolveReportYear
} from '../../../../core/utils/report-year';

@Component({
  selector: 'app-reports-details',
  standalone: true,
  imports: [CommonModule, QuarterStatus],
  templateUrl: './reports-details.html',
})
export class ReportsDetails implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private churchService = inject(ChurchService);
  private reportService = inject(ReportService);

  readonly reportYears = REPORT_YEAR_OPTIONS;
  readonly selectedYear = signal(CURRENT_REPORT_YEAR);
  readonly districtId = signal(0);
  readonly districtName = signal('');
  readonly district = signal<Church | null>(null);
  readonly churches = signal<Church[]>([]);
  readonly loadingChurches = signal(false);
  readonly errorMessage = signal('');
  readonly expandedChurchId = signal<number | null>(null);
  readonly churchDepartments = signal<Record<number, Department[]>>({});
  readonly loadingChurchDepartments = signal<Record<number, boolean>>({});
  readonly churchDepartmentErrors = signal<Record<number, string>>({});

  readonly quarterKeys = ['q1', 'q2', 'q3', 'q4'] as const;
  private readonly personalReportDepartmentIds = new Set<number>(PERSONAL_REPORT_DEPARTMENT_IDS);

  getReportDepartments(departments: Department[]): Department[] {
    return departments.filter(department => {
      const name = String(department.department_name || '').trim().toLowerCase();

      return !this.personalReportDepartmentIds.has(Number(department.department_id))
        && !name.includes('adventist mission')
        && !name.includes('ministerial')
        && !name.includes('baptism record')
        && !name.includes('death record');
    });
  }

  ngOnInit(): void {
    this.selectedYear.set(
      resolveReportYear(this.route.snapshot.queryParamMap.get('year'))
    );
    this.loadChurches();
  }

  onYearChange(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    if (!this.reportYears.includes(year) || year === this.selectedYear()) {
      return;
    }

    this.selectedYear.set(year);
    this.churchDepartments.set({});
    this.loadingChurchDepartments.set({});
    this.churchDepartmentErrors.set({});
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadChurches();
  }

  loadChurches(): void {
    this.errorMessage.set('');
    this.loadingChurches.set(true);
    const requestedYear = this.selectedYear();

    this.churchService.getMyDistrictChurches(requestedYear).subscribe({
      next: response => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }

        this.district.set(response.district ?? null);
        this.districtId.set(response.district?.church_id ?? 0);
        this.districtName.set(response.district?.name ?? '');
        this.churches.set(Array.isArray(response.data) ? response.data : []);
        this.loadingChurches.set(false);

        const expandedChurch = this.churches().find(
          church => church.church_id === this.expandedChurchId()
        );
        if (expandedChurch) {
          this.loadChurchDepartments(expandedChurch);
        }
      },
      error: error => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
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
          district_name: this.districtName(),
          year: this.selectedYear()
        }
      }
    );

  }

  openPersonalReport(): void {
    this.router.navigate(['/pastor/baptism']);
  }

  toggleChurch(church: Church): void {
    if (this.expandedChurchId() === church.church_id) {
      this.expandedChurchId.set(null);
      return;
    }

    this.expandedChurchId.set(church.church_id);

    if (Object.hasOwn(this.churchDepartments(), church.church_id)) {
      return;
    }

    this.loadChurchDepartments(church);
  }

  loadChurchDepartments(church: Church): void {
    this.loadingChurchDepartments.update(current => ({
      ...current,
      [church.church_id]: true
    }));
    const requestedYear = this.selectedYear();
    this.churchDepartmentErrors.update(current => ({
      ...current,
      [church.church_id]: ''
    }));

    this.reportService.getDepartments(church.church_id, requestedYear).subscribe({
      next: response => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        this.churchDepartments.update(current => ({
          ...current,
          [church.church_id]: Array.isArray(response) ? response : []
        }));
        this.loadingChurchDepartments.update(current => ({
          ...current,
          [church.church_id]: false
        }));
      },
      error: error => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        this.loadingChurchDepartments.update(current => ({
          ...current,
          [church.church_id]: false
        }));
        this.churchDepartmentErrors.update(current => ({
          ...current,
          [church.church_id]: error?.error?.message || 'Unable to load church departments.'
        }));
      }
    });
  }

  isChurchOpen(churchId: number): boolean {
    return this.expandedChurchId() === churchId;
  }

  openDepartment(church: Church, department: Department): void {
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
      church.church_id
    ], {
      queryParams: { year: this.selectedYear() }
    });
  }

  getQuarterStatus(
    department: Department,
    quarter: typeof this.quarterKeys[number]
  ): { label: string; tone: QuarterStatusTone } {
    if (department[`${quarter}_approved`]) {
      return { label: 'Approved', tone: 'approved' };
    }

    if (department[`${quarter}_submitted`]) {
      return { label: 'Submitted for review', tone: 'submitted' };
    }

    const progress = department[`${quarter}_data_progress`];
    if (progress === null || progress === undefined) {
      return { label: '—', tone: 'empty' };
    }

    return progress >= 100
      ? { label: 'Ready to submit', tone: 'ready' }
      : { label: 'Needs completion', tone: 'incomplete' };
  }

}