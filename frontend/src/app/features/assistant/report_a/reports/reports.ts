import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import {
  PERSONAL_REPORT_GROUP_DEPARTMENT_ID
} from '../../../../core/models/report.model';
import { Department } from '../../../../core/models/department.model';
import { RunningLoader } from '../../../../shared/components/running-loader/running-loader';
import { Button } from '../../../../shared/components/button/button';
import { QuarterStatus } from '../../../../shared/reports/quarter-status/quarter-status';

interface MonitoringAlert {
  quarter: string;
  status: string;
  tone: 'complete' | 'endorsed' | 'pending' | 'in-progress' | 'not-started';
}

@Component({
  selector: 'app-reports',
  standalone: true,

  imports: [
    CommonModule,
    RunningLoader,
    Button,
    QuarterStatus
  ],

  templateUrl: '../../../../shared/reports/reports/reports.html'
})
export class Reports implements OnInit {
  readonly quarterKeys: Array<'q1' | 'q2' | 'q3' | 'q4'> = ['q1', 'q2', 'q3', 'q4'];

  private readonly churchService =
    inject(ChurchService);

  private readonly router =
    inject(Router);

  private readonly authService = inject(AuthService);

  readonly districts = signal<Church[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly selectedDepartmentId = signal<number | null>(null);
  readonly districtChurches = signal<Record<number, Church[]>>({});
  readonly loadingDistrictChurches = signal<Record<number, boolean>>({});
  readonly expandedDistrictId = signal<number | null>(null);
  readonly loadingDistricts = signal(false);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly districtCount = computed(() => this.districts().length);
  readonly filteredDistricts = computed(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase();

    return searchTerm
      ? this.districts().filter(district =>
          district.name.toLocaleLowerCase().includes(searchTerm) ||
          (this.districtChurches()[district.church_id] ?? [])
            .some(church => church.name.toLocaleLowerCase().includes(searchTerm))
        )
      : this.districts();
  });
  readonly churchCount = computed(() => this.districts().reduce(
    (count, district) => count + (district.church_count ?? 0),
    0
  ));

  readonly personalReportGroupDepartmentId = PERSONAL_REPORT_GROUP_DEPARTMENT_ID;

  ngOnInit(): void {
    if (this.hasAllDepartmentAccess) {
      this.loadDepartmentOptions();
      return;
    }

    this.loadDistricts();
  }

  get hasAllDepartmentAccess(): boolean {
    const role = this.normalizedRole;
    return role === 'head assistant' || role === 'head director';
  }

  private get normalizedRole(): string {
    return String(this.authService.getCurrentUser()?.role || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, ' ');
  }

  loadDepartmentOptions(): void {
    this.loadingDistricts.set(true);
    this.errorMessage.set('');
    this.churchService.getDepartments().subscribe({
      next: (response) => {
        const departments = response?.success && Array.isArray(response.data)
          ? response.data
          : [];
        this.departments.set(departments);

        const assignedDepartmentId = Number(this.authService.getCurrentUser()?.department_id);
        const initialDepartment = departments.find(department =>
          Number(department.department_id) === assignedDepartmentId
        ) ?? departments[0];

        if (!initialDepartment) {
          this.loadingDistricts.set(false);
          this.errorMessage.set('No departments are available.');
          return;
        }

        this.selectedDepartmentId.set(Number(initialDepartment.department_id));
        this.loadDistricts();
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
        this.loadingDistricts.set(false);
        this.errorMessage.set('Unable to load departments. Check your connection and try again.');
      }
    });
  }

  loadDistricts(): void {
    this.loadingDistricts.set(true);
    this.errorMessage.set('');
    const departmentId = this.hasAllDepartmentAccess
      ? Number(this.selectedDepartmentId())
      : Number(this.authService.getCurrentUser()?.department_id);

    if ((this.isDepartmentScopedPortal || this.hasAllDepartmentAccess) &&
      (!Number.isInteger(departmentId) || departmentId < 1)) {
      this.districts.set([]);
      this.loadingDistricts.set(false);
      this.errorMessage.set('Your department is unavailable. Please sign in again or contact an administrator.');
      return;
    }

    const requestedDepartmentId =
      this.isDepartmentScopedPortal || this.hasAllDepartmentAccess ? departmentId : null;

    this.churchService
      .getDistricts(this.isDepartmentScopedPortal || this.hasAllDepartmentAccess
        ? departmentId
        : undefined)
      .subscribe({
        next: (response) => {
          if (
            requestedDepartmentId !== null &&
            requestedDepartmentId !== this.activeDepartmentId
          ) {
            return;
          }

          if (response?.success && Array.isArray(response.data)) {
            this.districts.set(response.data);
          } else {
            this.districts.set([]);
            this.errorMessage.set('Unable to load districts.');
          }

          this.loadingDistricts.set(false);
        },

        error: () => {
          if (
            requestedDepartmentId !== null &&
            requestedDepartmentId !== this.activeDepartmentId
          ) {
            return;
          }

          this.districts.set([]);
          this.loadingDistricts.set(false);
          this.errorMessage.set('Unable to connect to the district server.');
        }
      });
  }

  onDepartmentChange(event: Event): void {
    this.selectDepartment(Number((event.target as HTMLSelectElement).value));
  }

  selectDepartment(departmentId: number): void {
    if (!Number.isInteger(departmentId) || departmentId < 1) return;

    this.selectedDepartmentId.set(departmentId);
    this.districts.set([]);
    this.districtChurches.set({});
    this.loadingDistrictChurches.set({});
    this.expandedDistrictId.set(null);
    this.loadDistricts();
  }

  getMonitoring(district: Church): { q1: number | null; q2: number | null; q3: number | null; q4: number | null } {
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

    this.loadDistrictChurches(districtId);
  }

  private loadDistrictChurches(districtId: number): void {
    if (
      Object.hasOwn(this.districtChurches(), districtId) ||
      this.loadingDistrictChurches()[districtId]
    ) {
      return;
    }

    this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: true }));
    const requestedDepartmentId =
      this.isDepartmentScopedPortal || this.hasAllDepartmentAccess
        ? this.activeDepartmentId
        : null;

    this.churchService
      .getChurches(
        districtId,
        this.isDepartmentScopedPortal || this.hasAllDepartmentAccess
          ? this.activeDepartmentId
          : undefined
      )
      .subscribe({
        next: (response) => {
          if (
            requestedDepartmentId !== null &&
            requestedDepartmentId !== this.activeDepartmentId
          ) {
            return;
          }

          const churches = response?.success && Array.isArray(response.data)
            ? response.data
            : [];
          this.districtChurches.update(current => ({ ...current, [districtId]: churches }));
          this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
        },
        error: () => {
          if (
            requestedDepartmentId !== null &&
            requestedDepartmentId !== this.activeDepartmentId
          ) {
            return;
          }

          this.districtChurches.update(current => ({ ...current, [districtId]: [] }));
          this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
        }
      });
  }

  isDistrictOpen(districtId: number): boolean {
    return this.expandedDistrictId() === districtId;
  }

  updateSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchTerm.set(searchTerm);

    if (searchTerm.trim()) {
      this.districts().forEach(district => this.loadDistrictChurches(district.church_id));
    }
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  canViewPersonalReports(): boolean {
    return this.hasAllDepartmentAccess ||
      (Number(this.authService.getCurrentUser()?.department_id) === this.personalReportGroupDepartmentId
        && ['assistant', 'administrative assistant', 'director'].includes(this.normalizedRole));
  }

  private get activeDepartmentId(): number {
    return this.hasAllDepartmentAccess
      ? Number(this.selectedDepartmentId())
      : Number(this.authService.getCurrentUser()?.department_id);
  }

  openChurch(districtId: number, churchId: number): void {
    const portalPrefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';
    const departmentId = this.activeDepartmentId;

    if (!Number.isInteger(departmentId) || departmentId < 1) {
      this.errorMessage.set('Your department is unavailable. Please sign in again or contact an administrator.');
      return;
    }

    const reportType = departmentId === 22 || departmentId === 23
      ? 'records'
      : 'particulars';

    this.router.navigate([
      `${portalPrefix}/reports/${reportType}`,
      departmentId,
      districtId,
      churchId
    ], {
      queryParams: { return_to: 'monitoring' }
    });
  }

  getQuarterStatus(church: Church, quarter: 'q1' | 'q2' | 'q3' | 'q4'): MonitoringAlert | null {
    if (church.monitoring?.[`${quarter}_approved`]) {
      return { quarter: quarter.toUpperCase(), status: 'Approved', tone: 'complete' };
    }

    const progress = church.monitoring?.[quarter] ?? church[quarter] ?? null;
    if (church.monitoring?.[`${quarter}_endorsed`]) {
      return { quarter: quarter.toUpperCase(), status: 'Endorsed', tone: 'endorsed' };
    }

    if (church.monitoring?.[`${quarter}_submitted`]) {
      return { quarter: quarter.toUpperCase(), status: 'Submitted', tone: 'pending' };
    }

    if (progress === null) {
      return null;
    }

    if (progress === 100) {
      return { quarter: quarter.toUpperCase(), status: 'Ready to submit', tone: 'pending' };
    }

    if (progress > 0) {
      return { quarter: quarter.toUpperCase(), status: 'In progress', tone: 'in-progress' };
    }

    return { quarter: quarter.toUpperCase(), status: 'Not started', tone: 'not-started' };
  }

  openDistrict(
    districtid: number
  ): void {


    const prefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';

    this.router.navigate([`${prefix}/reports/details`, districtid]);
  }

  createReportTemplate(): void {
    this.router.navigate(['/assistant/reports/new']);
  }

  get isAssistantPortal(): boolean {
    return this.router.url.startsWith('/assistant');
  }

  get isDirectorPortal(): boolean {
    return this.router.url.startsWith('/director');
  }

  private get isDepartmentScopedPortal(): boolean {
    return this.isAssistantPortal || this.isDirectorPortal;
  }
}