import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import { ReportService } from '../../../../core/services/report/report';
import { Department } from '../../../../core/models/report.model';
import { RunningLoader } from '../../../../shared/components/running-loader/running-loader';

@Component({
  selector: 'app-reports',
  standalone: true,

  imports: [
    CommonModule,
    RunningLoader
  ],

  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {
  readonly quarterKeys: Array<'q1' | 'q2' | 'q3' | 'q4'> = ['q1', 'q2', 'q3', 'q4'];

  private readonly churchService =
    inject(ChurchService);

  private readonly reportService =
    inject(ReportService);

  private readonly router =
    inject(Router);

  readonly districts = signal<Church[]>([]);
  readonly districtChurches = signal<Record<number, Church[]>>({});
  readonly loadingDistrictChurches = signal<Record<number, boolean>>({});
  readonly departmentsByChurch = signal<Record<number, Department[]>>({});
  readonly loadingDepartments = signal<Record<number, boolean>>({});
  readonly expandedDistrictId = signal<number | null>(null);
  readonly expandedChurchId = signal<number | null>(null);
  readonly loadingDistricts = signal(false);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly districtCount = computed(() => this.districts().length);
  readonly filteredDistricts = computed(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase();

    return searchTerm
      ? this.districts().filter(district => district.name.toLocaleLowerCase().includes(searchTerm))
      : this.districts();
  });
  readonly churchCount = computed(() => this.districts().reduce(
    (count, district) => count + (district.church_count ?? 0),
    0
  ));

  private readonly personalReportDepartmentIds = new Set([16, 20, 22, 23]);

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.loadingDistricts.set(true);
    this.errorMessage.set('');

    this.churchService
      .getDistricts()
      .subscribe({
        next: (response) => {
          if (response?.success && Array.isArray(response.data)) {
            this.districts.set(response.data);
          } else {
            this.districts.set([]);
            this.errorMessage.set('Unable to load districts.');
          }

          this.loadingDistricts.set(false);
        },

        error: () => {
          this.districts.set([]);
          this.loadingDistricts.set(false);
          this.errorMessage.set('Unable to connect to the district server.');
        }
      });
  }

  getMonitoring(district: Church): {
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
  } {
    return {
      q1: district.q1 ?? null,
      q2: district.q2 ?? null,
      q3: district.q3 ?? null,
      q4: district.q4 ?? null
    };
  }

  toggleDistrict(districtId: number): void {
    if (this.expandedDistrictId() === districtId) {
      this.expandedDistrictId.set(null);
      return;
    }

    this.expandedDistrictId.set(districtId);

    if (Object.hasOwn(this.districtChurches(), districtId)) {
      return;
    }

    this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: true }));

    this.churchService
      .getChurches(districtId)
      .subscribe({
        next: (response) => {
          const churches = response?.success && Array.isArray(response.data)
            ? response.data
            : [];
          this.districtChurches.update(current => ({ ...current, [districtId]: churches }));
          this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
        },
        error: () => {
          this.districtChurches.update(current => ({ ...current, [districtId]: [] }));
          this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
        }
      });
  }

  isDistrictOpen(districtId: number): boolean {
    return this.expandedDistrictId() === districtId;
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  toggleChurch(churchId: number): void {
    this.expandedChurchId.set(this.expandedChurchId() === churchId ? null : churchId);

    if (this.expandedChurchId() !== churchId || Object.hasOwn(this.departmentsByChurch(), churchId)) {
      return;
    }

    this.loadingDepartments.update(current => ({ ...current, [churchId]: true }));
    this.reportService.getDepartments(churchId).subscribe({
      next: (response) => {
        const departments = Array.isArray(response) ? response : [];
        this.departmentsByChurch.update(current => ({ ...current, [churchId]: departments }));
        this.loadingDepartments.update(current => ({ ...current, [churchId]: false }));
      },
      error: () => {
        this.departmentsByChurch.update(current => ({ ...current, [churchId]: [] }));
        this.loadingDepartments.update(current => ({ ...current, [churchId]: false }));
      }
    });
  }

  isChurchOpen(churchId: number): boolean {
    return this.expandedChurchId() === churchId;
  }

  getReportDepartments(churchId: number): Department[] {
    return (this.departmentsByChurch()[churchId] ?? []).filter(
      department => !this.isPersonalReportDepartment(department)
    );
  }

  getPersonalReportDepartments(churchId: number): Department[] {
    return (this.departmentsByChurch()[churchId] ?? []).filter(
      department => this.isPersonalReportDepartment(department)
    );
  }

  openPersonalReport(districtId: number, churchId: number): void {
    const portalPrefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';

    this.router.navigate([
      `${portalPrefix}/reports/records`,
      22,
      districtId,
      churchId
    ], {
      queryParams: { return_to: 'monitoring' }
    });
  }

  private isPersonalReportDepartment(department: Department): boolean {
    const name = String(department.department_name || '').trim().toLowerCase();

    return this.personalReportDepartmentIds.has(Number(department.department_id))
      || name.includes('adventist mission')
      || name.includes('ministerial')
      || name.includes('baptism record')
      || name.includes('death record');
  }

  getDepartmentProgress(department: Department, quarter: 'q1' | 'q2' | 'q3' | 'q4'): number | null {
    return {
      q1: department.q1_data_progress,
      q2: department.q2_data_progress,
      q3: department.q3_data_progress,
      q4: department.q4_data_progress
    }[quarter] ?? null;
  }

  isDepartmentApproved(department: Department, quarter: 'q1' | 'q2' | 'q3' | 'q4'): boolean {
    return Boolean({
      q1: department.q1_approved,
      q2: department.q2_approved,
      q3: department.q3_approved,
      q4: department.q4_approved
    }[quarter]);
  }

  openDepartment(department: Department, districtId: number, churchId: number): void {
    if (!department?.department_id) {
      return;
    }

    const portalPrefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';
    const departmentName = String(department.department_name || '').toLowerCase();
    const isBaptismOrDeath = department.department_id === 22
      || department.department_id === 23
      || departmentName.includes('baptism')
      || departmentName.includes('death');

    const reportType = isBaptismOrDeath ? 'records' : 'particulars';
    this.router.navigate([
      `${portalPrefix}/reports/${reportType}`,
      department.department_id,
      districtId,
      churchId
    ], {
      queryParams: { return_to: 'monitoring' }
    });
  }

  getQuarterValue(church: Church, quarter: 'q1' | 'q2' | 'q3' | 'q4'): number | null {
    const monitoringValue = church.monitoring?.[quarter];

    if (typeof monitoringValue === 'number') {
      return monitoringValue;
    }

    return typeof church[quarter] === 'number' ? church[quarter] ?? null : null;
  }

  isQuarterApproved(church: Church, quarter: 'q1' | 'q2' | 'q3' | 'q4'): boolean {
    return Boolean(church.monitoring?.[`${quarter}_approved`]);
  }

  openChurch(church: Church): void {
    const prefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';

    this.router.navigate([`${prefix}/reports/details`, church.church_id]);
  }

  openDistrict(
    districtid: number
  ): void {


    const prefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';

    this.router.navigate([`${prefix}/reports/details`, districtid]);
  }

}