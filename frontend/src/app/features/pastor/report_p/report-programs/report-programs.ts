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
import { ChurchService } from '../../../../core/services/church/church-service';

import {
  Department
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

  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }

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

  private readonly emptyMonitoring: Monitoring = {
    q1: { progress: null, approved: false },
    q2: { progress: null, approved: false },
    q3: { progress: null, approved: false },
    q4: { progress: null, approved: false }
  };

  getMonitoring(index: number): Monitoring {
    const department = this.reportDepartments[index];

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
