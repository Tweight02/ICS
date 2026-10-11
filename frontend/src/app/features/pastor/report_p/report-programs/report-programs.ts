import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { ReportService } from '../../../../core/services/report/report';
import { ChurchService } from '../../../../core/services/church/church-service';

import {
  Department,
  DepartmentReport,
  ReportQuarter
} from '../../../../core/models/report.model';

interface Monitoring {
  q1: QuarterMonitoring;
  q2: QuarterMonitoring;
  q3: QuarterMonitoring;
  q4: QuarterMonitoring;
}

interface QuarterMonitoring {
  value: number | null;
  endorsed: boolean;
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
  private readonly churchService = inject(ChurchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  districtId = 0;
  districtName = '';
  churchId = 0;
  churchName = '';

  departments: Department[] = [];

  loading = false;
  loadingMonitoring = false;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(pathParams => {
      const queryParams = this.route.snapshot.queryParamMap;
      this.districtId =
        Number(pathParams.get('districtId') || queryParams.get('district_id')) || 0;
      this.churchId =
        Number(pathParams.get('churchId') || queryParams.get('church_id')) || 0;
      this.districtName = queryParams.get('district_name') || '';
      this.churchName = queryParams.get('church_name') || '';

      this.departments = [];
      this.monitoring = {};
      this.errorMessage = '';
      this.loading = false;
      this.loadingMonitoring = false;

      if (!this.churchId) {
        this.errorMessage = 'Church ID was not provided.';
        this.cdr.detectChanges();
        return;
      }

      this.resolveChurchLabel();
      this.loadDepartments();
    });
  }

  get reportDepartments(): Department[] {
    return this.departments.filter(department =>
      this.isReportDepartment(department)
    );
  }

  isReportDepartment(department: Department): boolean {
    const name = String(department.department_name || '').trim().toLowerCase();
    const excludedReports = ['baptism', 'death'];

    return this.portalPrefix() !== '/pastor'
      || !excludedReports.some(excluded => name.includes(excluded));
  }

  openDepartment(department: Department): void {
    if (!department?.department_id) {
      return;
    }

    const portalPrefix = this.portalPrefix();
    const departmentName = String(department.department_name || '').toLowerCase();

    if (
      portalPrefix !== '/pastor'
      && (
        department.department_id === 22
        || department.department_id === 23
        || departmentName.includes('baptism')
        || departmentName.includes('death')
      )
    ) {
      this.router.navigate([
        `${portalPrefix}/reports/records`,
        department.department_id,
        this.districtId,
        this.churchId
      ]);
      return;
    }

    this.router.navigate(
      [
        `${portalPrefix}/reports/particulars`,
        department.department_id,
        this.districtId,
        this.churchId
      ]
    );
  }

  trackDepartment(index: number, department: Department): number {
    return department.department_id || index;
  }

  backToReportDetails(): void {
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
    ]);
  }

  private portalPrefix(): '/pastor' | '/assistant' | '/director' {
    const url = this.router.url;

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

  private loadDepartments(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.reportService.getDepartments(this.churchId).subscribe({
      next: (response: Department[] | { data?: Department[] }) => {
        const data = Array.isArray(response)
          ? response
          : (response?.data ?? []);

        this.departments = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.detectChanges();
        this.loadMonitoring();
      },
      error: error => {
        this.departments = [];
        this.errorMessage =
          error?.error?.message || 'Unable to load reports.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private monitoring: Record<number, Monitoring> = {};

  private readonly emptyMonitoring: Monitoring = {
    q1: { value: null, endorsed: false },
    q2: { value: null, endorsed: false },
    q3: { value: null, endorsed: false },
    q4: { value: null, endorsed: false }
  };

  getMonitoring(index: number): Monitoring {
    const department = this.reportDepartments[index];

    return (department && this.monitoring[department.department_id])
      || this.emptyMonitoring;
  }

  private loadMonitoring(): void {
    const departments = this.reportDepartments;

    if (departments.length === 0) {
      this.loadingMonitoring = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingMonitoring = true;
    this.cdr.detectChanges();

    const requests = departments.map(department =>
      this.reportService
        .getDepartmentReport(this.churchId, department.department_id)
        .pipe(
          map(report => this.buildMonitoring(report))
        )
    );

    forkJoin(requests).subscribe({
      next: results => {
        departments.forEach((department, index) => {
          this.monitoring[department.department_id] = results[index];
        });

        this.loadingMonitoring = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Unable to load department report monitoring:', error);
        this.loadingMonitoring = false;
        this.errorMessage = 'Unable to load report monitoring.';
        this.cdr.detectChanges();
      }
    });
  }

  private buildMonitoring(report: DepartmentReport): Monitoring {
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

    const latestYear = Math.max(...records.map(item => Number(item.year)));
    const current = records.filter(item => Number(item.year) === latestYear);

    const progressFor = (quarterNumber: number): QuarterMonitoring => {
      const items = current.filter(
        item => this.getQuarterNumber(item.quarter) === quarterNumber
      );

      if (items.length === 0) {
        return { value: null, endorsed: false };
      }

      const approved = items.every(item => this.hasDate(item.mission_approve));
      const filled = items.filter(
        item => item.value !== null && item.value !== undefined
      ).length;

      return {
        value: approved
          ? 100
          : filled === 0
            ? null
            : Math.min(99, Math.round((filled / items.length) * 100)),
        endorsed: !approved && items.every(item => this.hasDate(item.district_endorse))
      };
    };

    return {
      q1: progressFor(1),
      q2: progressFor(2),
      q3: progressFor(3),
      q4: progressFor(4)
    };
  }

  private hasDate(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private getQuarterNumber(quarter: string): number {
    const value = String(quarter).toUpperCase();

    if (value.includes('1')) return 1;
    if (value.includes('2')) return 2;
    if (value.includes('3')) return 3;
    if (value.includes('4')) return 4;

    return 99;
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
