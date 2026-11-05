import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ReportService } from '../../../../core/services/report/report';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Button } from '../../../../shared/components/button/button';
import { QuarterStatus, resolveQuarterStatus } from '../../../../shared/reports/quarter-status/quarter-status';
import {
  CURRENT_REPORT_YEAR,
  REPORT_YEAR_OPTIONS,
  resolveReportYear
} from '../../../../core/utils/report-year';

import {
  Department,
  PERSONAL_REPORT_DEPARTMENT_IDS,
  PERSONAL_REPORT_GROUP_DEPARTMENT_ID
} from '../../../../core/models/report.model';

interface Monitoring {
  q1: QuarterMonitoring;
  q2: QuarterMonitoring;
  q3: QuarterMonitoring;
  q4: QuarterMonitoring;
}

interface QuarterMonitoring {
  progress: number | null;
  approved: boolean;
  submitted: boolean;
}

@Component({
  selector: 'app-report-programs',
  standalone: true,
  imports: [CommonModule, Button, QuarterStatus],
  templateUrl: '../../../../shared/reports/report-programs/report-programs.html',
})
export class ReportPrograms implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly auth = inject(AuthService);
  private readonly churchService = inject(ChurchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  districtId = 0;
  districtName = '';
  churchId = 0;
  churchName = '';
  readonly reportYears = REPORT_YEAR_OPTIONS;
  readonly selectedYear = signal(CURRENT_REPORT_YEAR);

  departments: Department[] = [];

  readonly personalReportGroupDepartmentId = PERSONAL_REPORT_GROUP_DEPARTMENT_ID;
  private readonly personalReportDepartmentIds = new Set<number>(PERSONAL_REPORT_DEPARTMENT_IDS);

  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }

  errorMessage = '';

  ngOnInit(): void {
    this.selectedYear.set(
      resolveReportYear(this.route.snapshot.queryParamMap.get('year'))
    );

    if (this.isRepresentativePortal) {
      this.resolveRepresentativeChurch();
      return;
    }

    this.route.paramMap.subscribe(pathParams => {
      const queryParams = this.route.snapshot.queryParamMap;
      this.selectedYear.set(resolveReportYear(queryParams.get('year')));
      this.districtId =
        Number(pathParams.get('districtId') || queryParams.get('district_id')) || 0;
      this.churchId =
        Number(pathParams.get('churchId') || queryParams.get('church_id')) || 0;
      this.districtName = queryParams.get('district_name') || '';
      this.churchName = queryParams.get('church_name') || '';

      this.departments = [];
      this.errorMessage = '';
      this.loading = false;

      if (!this.churchId) {
        this.errorMessage = 'Church ID was not provided.';
        this.cdr.detectChanges();
        return;
      }

      this.resolveChurchLabel();
      this.loadDepartments();
    });
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
    this.loadDepartments();
  }

  get isRepresentativePortal(): boolean {
    return this.router.url.startsWith('/representative');
  }

  get reportDepartments(): Department[] {
    if (this.isRepresentativePortal) {
      return this.departments.filter(department =>
        this.isRepresentativeReport(department)
      );
    }

    return this.departments.filter(department =>
      !this.isPersonalReportDepartment(department)
    );
  }

  get representativeDepartments(): Department[] {
    return this.reportDepartments;
  }

  get personalReportDepartments(): Department[] {
    if (this.isRepresentativePortal) {
      return [];
    }

    return this.departments.filter(department =>
      this.isPersonalReportDepartment(department)
    );
  }

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

  private isPersonalReportDepartment(department: Department): boolean {
    const name = String(department.department_name || '').trim().toLowerCase();

    return this.personalReportDepartmentIds.has(Number(department.department_id))
      || name.includes('adventist mission')
      || name.includes('ministerial')
      || name.includes('baptism record')
      || name.includes('death record');
  }

  openDepartment(department: Department): void {
    if (!department?.department_id) {
      return;
    }

    const portalPrefix = this.portalPrefix();
    if (this.isRepresentativePortal) {
      this.router.navigate([
        '/representative/reports/particulars',
        department.department_id
      ]);
      return;
    }

    const departmentName = String(department.department_name || '').toLowerCase();

    const isBaptismOrDeath = department.department_id === 22
      || department.department_id === 23
      || departmentName.includes('baptism')
      || departmentName.includes('death');

    if (isBaptismOrDeath && portalPrefix === '/pastor') {
      this.router.navigate(['/pastor/deathbap']);
      return;
    }

    if (isBaptismOrDeath) {
      this.router.navigate([
        `${portalPrefix}/reports/records`,
        department.department_id,
        this.districtId,
        this.churchId
      ], {
        queryParams: this.monitoringReturnParams()
      });
      return;
    }

    this.router.navigate(
      [
        `${portalPrefix}/reports/particulars`,
        department.department_id,
        this.districtId,
        this.churchId
      ],
      {
        queryParams: this.monitoringReturnParams()
      }
    );
  }

  trackDepartment(index: number, department: Department): number {
    return department.department_id || index;
  }

  backToReportDetails(): void {
    if (this.isRepresentativePortal) {
      this.router.navigate(['/representative/reports/programs']);
      return;
    }

    if (this.portalPrefix() === '/pastor') {
      this.router.navigate(['/pastor/reports/details']);
      return;
    }

    if (!this.districtId) {
      this.router.navigate([`${this.portalPrefix()}/reports`]);
      return;
    }

    this.router.navigate([
      `${this.portalPrefix()}/reports/details`,
      this.districtId
    ], {
      queryParams: {
        district_id: String(this.districtId),
        district_name: this.districtName,
        ...this.monitoringReturnParams()
      }
    });
  }

  private monitoringReturnParams(): Record<string, string> {
    const queryParams = this.route.snapshot.queryParamMap;
    const keys = [
      'return_to',
      'return_department',
      'return_expanded',
      'return_search',
      'return_scroll',
      'year'
    ];

    const params = keys.reduce<Record<string, string>>((result, key) => {
      const value = queryParams.get(key);
      if (value !== null) {
        result[key] = value;
      }
      return result;
    }, {});
    params['year'] = String(this.selectedYear());

    return params;
  }

  private portalPrefix(): '/pastor' | '/assistant' | '/director' | '/representative' {
    const url = this.router.url;

    if (url.startsWith('/representative')) {
      return '/representative';
    }

    if (url.startsWith('/assistant')) {
      return '/assistant';
    }

    if (url.startsWith('/director')) {
      return '/director';
    }

    return '/pastor';
  }

  private resolveChurchLabel(): void {
    if ((this.churchName && this.districtName) || !this.districtId) {
      return;
    }

    this.churchService.getChurches(this.districtId).subscribe({
      next: response => {
        if (!this.districtName) {
          this.districtName = response.district?.name || '';
        }

        if (!this.churchName) {
          const church = (response.data || []).find(
            item => Number(item.church_id) === this.churchId
          );
          this.churchName = church?.name || this.churchName;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  private resolveRepresentativeChurch(): void {
    const user = this.auth.getCurrentUser();

    if (!user?.church_id) {
      this.errorMessage =
        'Your account does not have a church assigned. Please contact the administrator.';
      return;
    }

    this.loading = true;
    this.churchService.getAllChurches().subscribe({
      next: response => {
        const churches = Array.isArray(response.data) ? response.data : [];
        const assignedChurch = churches.find(
          church => Number(church.church_id) === Number(user.church_id)
        );

        if (!assignedChurch) {
          this.loading = false;
          this.errorMessage = 'Your assigned church could not be found.';
          this.cdr.detectChanges();
          return;
        }

        const districtId = Number(assignedChurch.parent_id ?? assignedChurch.church_id);
        const district = churches.find(
          church => Number(church.church_id) === districtId && church.parent_id === null
        );

        if (!district) {
          this.loading = false;
          this.errorMessage = 'The district for your assigned church could not be found.';
          this.cdr.detectChanges();
          return;
        }

        let reportChurch = assignedChurch;
        if (assignedChurch.parent_id === null) {
          const districtChurches = churches.filter(
            church => Number(church.parent_id) === districtId
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

        this.districtId = districtId;
        this.districtName = district.name;
        this.churchId = Number(reportChurch.church_id);
        this.churchName = reportChurch.name;
        this.loadDepartments();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load church and district names.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadDepartments(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    const requestedYear = this.selectedYear();

    this.reportService.getDepartments(this.churchId, requestedYear).subscribe({
      next: (response: Department[] | { data?: Department[] }) => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        const data = Array.isArray(response)
          ? response
          : (response?.data ?? []);

        this.departments = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        this.departments = [];
        this.errorMessage =
          error?.error?.message || 'Unable to load reports.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private readonly emptyMonitoring: Monitoring = {
    q1: { progress: null, approved: false, submitted: false },
    q2: { progress: null, approved: false, submitted: false },
    q3: { progress: null, approved: false, submitted: false },
    q4: { progress: null, approved: false, submitted: false }
  };

  getMonitoring(index: number): Monitoring {
    const department = this.reportDepartments[index];

    return this.monitoringFor(department);
  }

  getPersonalMonitoring(index: number): Monitoring {
    const department = this.personalReportDepartments[index];

    return this.monitoringFor(department);
  }

  getQuarterStatus(quarter: QuarterMonitoring) {
    return resolveQuarterStatus(quarter);
  }

  private monitoringFor(department: Department | undefined): Monitoring {

    if (!department) {
      return this.emptyMonitoring;
    }

    return {
      q1: {
        progress: department.q1_data_progress ?? null,
        approved: !!department.q1_approved,
        submitted: !!department.q1_submitted
      },
      q2: {
        progress: department.q2_data_progress ?? null,
        approved: !!department.q2_approved,
        submitted: !!department.q2_submitted
      },
      q3: {
        progress: department.q3_data_progress ?? null,
        approved: !!department.q3_approved,
        submitted: !!department.q3_submitted
      },
      q4: {
        progress: department.q4_data_progress ?? null,
        approved: !!department.q4_approved,
        submitted: !!department.q4_submitted
      }
    };
  }

  getDepartmentIcon(departmentName: string): string {
    const name = String(departmentName || '').toLowerCase();

    if (name.includes('children')) return 'bi-people-fill';
    if (name.includes('stewardship')) return 'bi-cash-coin';
    if (name.includes('sabbath')) return 'bi-book';
    if (name.includes('ministerial') || name.includes('evangelism')) {
      return 'bi-journal-bookmark';
    }
    if (name.includes('youth')) return 'bi-person-arms-up';
    if (name.includes('women')) return 'bi-gender-female';
    if (name.includes('communication')) return 'bi-chat-dots';
    if (name.includes('mission')) return 'bi-globe-americas';
    if (name.includes('secretariat')) return 'bi-folder2-open';

    return 'bi-file-earmark-text';
  }
}
