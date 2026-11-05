import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

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
import {
  CURRENT_REPORT_YEAR,
  REPORT_YEAR_OPTIONS,
  resolveReportYear
} from '../../../../core/utils/report-year';

interface MonitoringAlert {
  quarter: string;
  status: string;
  tone: 'complete' | 'endorsed' | 'pending' | 'in-progress' | 'not-started';
}

const HIDDEN_HEAD_ASSISTANT_DEPARTMENTS = new Set([
  'adventist mission',
  'baptism record',
  'death record',
]);

const PERSONAL_REPORT_DEPARTMENTS = new Set([
  'adventist mission',
  'baptism record',
  'death record',
  'ministerial & evangelism',
]);

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
  readonly reportYears = REPORT_YEAR_OPTIONS;
  readonly selectedYear = signal(CURRENT_REPORT_YEAR);

  private readonly churchService =
    inject(ChurchService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly authService = inject(AuthService);
  private returnStateApplied = false;
  private pendingScrollRestoration = false;

  readonly districts = signal<Church[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly districtChurches = signal<Record<number, Church[]>>({});
  readonly districtDepartmentMonitoring = signal<
    Record<number, Record<number, Record<number, Church['monitoring']>>>
  >({});
  readonly districtPastorMonitoring = signal<Record<number, Church['monitoring']>>({});
  readonly loadingDistrictChurches = signal<Record<number, boolean>>({});
  readonly expandedDistrictId = signal<number | null>(null);
  readonly expandedChurchIds = signal<Record<number, number>>({});
  readonly loadingDistricts = signal(false);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly districtCount = computed(() => this.districts().length);
  readonly filteredDistricts = computed(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase();

    return searchTerm
      ? this.districts().filter(district =>
          district.name.toLocaleLowerCase().includes(searchTerm)
        )
      : this.districts();
  });
  readonly churchCount = computed(() => this.districts().reduce(
    (count, district) => count + (district.church_count ?? 0),
    0
  ));
  readonly churchMonitoringDepartments = computed(() =>
    this.departments().filter(department =>
      !PERSONAL_REPORT_DEPARTMENTS.has(
        department.department_name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
      )
    )
  );

  get personalReportGroupDepartmentId(): number {
    const ministerialDepartment = this.departments().find(department =>
      department.department_name.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ===
        'ministerial & evangelism'
    );

    return Number(
      ministerialDepartment?.department_id ?? PERSONAL_REPORT_GROUP_DEPARTMENT_ID
    );
  }

  ngOnInit(): void {
    this.selectedYear.set(
      resolveReportYear(this.route.snapshot.queryParamMap.get('year'))
    );

    if (this.hasAllDepartmentAccess) {
      this.loadDepartmentOptions();
      return;
    }

    this.loadAssignedDepartmentOption();
    this.loadDistricts();
  }

  get hasAllDepartmentAccess(): boolean {
    const role = this.normalizedRole;
    const user = this.authService.getCurrentUser();

    return role === 'head assistant' ||
      (
        ['assistant', 'administrative assistant'].includes(role) &&
        user?.department_id == null
      );
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
        const allDepartments = response?.success && Array.isArray(response.data)
          ? response.data
          : [];
        const departments = this.normalizedRole === 'head assistant'
          ? allDepartments.filter(department =>
              !HIDDEN_HEAD_ASSISTANT_DEPARTMENTS.has(
                department.department_name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
              )
            )
          : allDepartments;
        this.departments.set(departments);

        if (!departments.length) {
          this.loadingDistricts.set(false);
          this.errorMessage.set('No departments are available.');
          return;
        }

        this.loadDistricts();
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
        this.loadingDistricts.set(false);
        this.errorMessage.set('Unable to load departments. Check your connection and try again.');
      }
    });
  }

  private loadAssignedDepartmentOption(): void {
    const departmentId = Number(this.authService.getCurrentUser()?.department_id);
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      return;
    }

    this.departments.set([{
      department_id: departmentId,
      department_name: `Department ${departmentId}`
    }]);
    this.churchService.getDepartments().subscribe({
      next: (response) => {
        const department = response?.data?.find(
          item => Number(item.department_id) === departmentId
        );
        if (department) {
          this.departments.set([department]);
        }
      },
      error: (error) => {
        console.error('Failed to load department name:', error);
        this.errorMessage.set('Unable to load department details.');
      }
    });
  }

  loadDistricts(): void {
    this.loadingDistricts.set(true);
    this.errorMessage.set('');
    const departmentId = Number(this.authService.getCurrentUser()?.department_id);
    const hasAssignedDepartment = this.isDepartmentScopedPortal &&
      !this.hasAllDepartmentAccess;

    if (hasAssignedDepartment &&
      (!Number.isInteger(departmentId) || departmentId < 1)) {
      this.districts.set([]);
      this.loadingDistricts.set(false);
      this.errorMessage.set('Your department is unavailable. Please sign in again or contact an administrator.');
      return;
    }

    const requestedDepartmentId =
      hasAssignedDepartment ? departmentId : null;
    const requestedYear = this.selectedYear();

    this.churchService
      .getDistricts(hasAssignedDepartment
        ? departmentId
        : undefined, requestedYear)
      .subscribe({
        next: (response) => {
          if (
            requestedDepartmentId !== null &&
            requestedDepartmentId !== Number(this.authService.getCurrentUser()?.department_id)
          ) {
            return;
          }
          if (requestedYear !== this.selectedYear()) {
            return;
          }

          if (response?.success && Array.isArray(response.data)) {
            this.districts.set(response.data);
            this.restoreMonitoringState();
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
          if (requestedYear !== this.selectedYear()) {
            return;
          }

          this.districts.set([]);
          this.loadingDistricts.set(false);
          this.errorMessage.set('Unable to connect to the district server.');
        }
      });
  }

  selectYear(year: number): void {
    if (!this.reportYears.includes(year) || year === this.selectedYear()) {
      return;
    }

    this.selectedYear.set(year);
    this.districts.set([]);
    this.districtChurches.set({});
    this.districtDepartmentMonitoring.set({});
    this.districtPastorMonitoring.set({});
    this.loadingDistrictChurches.set({});
    this.expandedDistrictId.set(null);
    this.expandedChurchIds.set({});
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadDistricts();
  }

  onYearChange(event: Event): void {
    this.selectYear(Number((event.target as HTMLSelectElement).value));
  }

  openDistrictPastorReport(
    districtId: number,
    quarter?: 'q1' | 'q2' | 'q3' | 'q4'
  ): void {
    if (!Number.isInteger(districtId) || districtId < 1) {
      return;
    }

    const portalPrefix = this.isAssistantPortal ? '/assistant' : '/director';
    const queryParams = this.monitoringReturnParams(this.personalReportGroupDepartmentId);
    if (quarter) {
      queryParams['quarter'] = quarter.toUpperCase();
    }

    void this.router.navigate([
      `${portalPrefix}/reports/records`,
      this.personalReportGroupDepartmentId,
      districtId,
      districtId
    ], {
      queryParams
    });
  }

  openDepartmentQuarterReport(
    districtId: number,
    churchId: number,
    departmentId: number,
    quarter: 'q1' | 'q2' | 'q3' | 'q4'
  ): void {
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      this.errorMessage.set('Department is unavailable. Please sign in again or contact an administrator.');
      return;
    }

    const portalPrefix = this.isAssistantPortal ? '/assistant' : '/director';
    const reportType = departmentId === 22 || departmentId === 23
      ? 'records'
      : 'particulars';
    void this.router.navigate([
      `${portalPrefix}/reports/${reportType}`,
      departmentId,
      districtId,
      churchId
    ], {
      queryParams: {
        ...this.monitoringReturnParams(departmentId),
        year: String(this.selectedYear()),
        quarter: quarter.toUpperCase()
      }
    });
  }

  getDepartmentQuarterStatus(
    districtId: number,
    church: Church,
    departmentId: number,
    quarter: 'q1' | 'q2' | 'q3' | 'q4'
  ): MonitoringAlert | null {
    const monitoring = this.districtDepartmentMonitoring()[districtId]?.[church.church_id]?.[departmentId];
    return this.getQuarterStatus({ ...church, monitoring }, quarter);
  }

  onDistrictSelected(districtId: number): void {
    this.toggleDistrict(districtId);
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

  toggleChurch(districtId: number, churchId: number): void {
    this.expandedChurchIds.update(current => {
      const next = { ...current };
      if (next[districtId] === churchId) {
        delete next[districtId];
      } else {
        next[districtId] = churchId;
      }
      return next;
    });
  }

  isChurchOpen(districtId: number, churchId: number): boolean {
    return this.expandedChurchIds()[districtId] === churchId;
  }

  private loadDistrictChurches(districtId: number): void {
    if (
      Object.hasOwn(this.districtChurches(), districtId) ||
      this.loadingDistrictChurches()[districtId]
    ) {
      return;
    }

    this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: true }));
    const requestedYear = this.selectedYear();

    const assignedDepartmentId = Number(this.authService.getCurrentUser()?.department_id);
    const assignedDepartment = this.departments().find(
      department => Number(department.department_id) === assignedDepartmentId
    ) ?? {
      department_id: assignedDepartmentId,
      department_name: `Department ${assignedDepartmentId}`
    };
    if (!this.hasAllDepartmentAccess) {
      this.departments.set([assignedDepartment]);
    }

    const churchesRequest = this.hasAllDepartmentAccess
      ? this.churchService.getChurches(districtId, undefined, requestedYear, true)
      : this.churchService.getChurches(
          districtId,
          assignedDepartment.department_id,
          requestedYear
        );

    churchesRequest.subscribe({
      next: (response) => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }

        const churches = response?.success && Array.isArray(response.data)
          ? response.data
          : [];
        if (!response?.success) {
          this.districtChurches.update(current => ({ ...current, [districtId]: [] }));
          this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
          this.errorMessage.set('Unable to load department monitoring for this district.');
          this.restoreMonitoringScroll();
          return;
        }
        const monitoringByChurch: Record<number, Record<number, Church['monitoring']>> = {};
        churches.forEach(church => {
          monitoringByChurch[church.church_id] = this.hasAllDepartmentAccess
            ? church.monitoring_by_department ?? {}
            : { [assignedDepartment.department_id]: church.monitoring };
        });

        this.districtPastorMonitoring.update(current => ({
          ...current,
          [districtId]: response.district?.monitoring
        }));
        this.districtChurches.update(current => ({ ...current, [districtId]: churches }));
        this.districtDepartmentMonitoring.update(current => ({
          ...current,
          [districtId]: monitoringByChurch
        }));
        this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
        this.restoreMonitoringScroll();
      },
      error: (error) => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        console.error('Failed to load church department monitoring:', error);
        this.districtChurches.update(current => ({ ...current, [districtId]: [] }));
        this.loadingDistrictChurches.update(current => ({ ...current, [districtId]: false }));
        this.errorMessage.set('Unable to load department monitoring for this district.');
        this.restoreMonitoringScroll();
      }
    });
  }

  private restoreMonitoringState(): void {
    const queryParams = this.route.snapshot.queryParamMap;

    if (queryParams.get('return_to') !== 'monitoring' || this.returnStateApplied) {
      return;
    }

    this.returnStateApplied = true;
    this.searchTerm.set(queryParams.get('return_search') ?? '');
    this.pendingScrollRestoration = true;
    const expandedDistrictId = Number(queryParams.get('return_expanded'));
    const expandedChurchId = Number(queryParams.get('return_church'));
    const districtExists = this.districts().some(
      district => Number(district.church_id) === expandedDistrictId
    );

    if (districtExists) {
      this.expandedDistrictId.set(expandedDistrictId);
      if (expandedChurchId > 0) {
        this.expandedChurchIds.update(current => ({
          ...current,
          [expandedDistrictId]: expandedChurchId
        }));
      }
      this.loadDistrictChurches(expandedDistrictId);
    }

    if (!districtExists) {
      this.restoreMonitoringScroll();
    }
  }

  private restoreMonitoringScroll(): void {
    if (!this.pendingScrollRestoration) {
      return;
    }

    const scrollPosition = Number(
      this.route.snapshot.queryParamMap.get('return_scroll')
    );
    this.pendingScrollRestoration = false;

    if (!Number.isFinite(scrollPosition) || scrollPosition <= 0) {
      return;
    }

    setTimeout(() => window.scrollTo(0, scrollPosition));
  }

  private monitoringReturnParams(departmentId?: number): Record<string, string> {
    const params: Record<string, string> = {
      return_to: 'monitoring',
      year: String(this.selectedYear())
    };

    if (departmentId !== undefined) {
      params['return_department'] = String(departmentId);
    } else if (this.isDepartmentScopedPortal && !this.hasAllDepartmentAccess) {
      params['return_department'] = String(this.activeDepartmentId);
    }

    const expandedDistrictId = this.expandedDistrictId();
    if (expandedDistrictId !== null) {
      params['return_expanded'] = String(expandedDistrictId);
      const expandedChurchId = this.expandedChurchIds()[expandedDistrictId];
      if (expandedChurchId !== undefined) {
        params['return_church'] = String(expandedChurchId);
      }
    }

    const searchTerm = this.searchTerm().trim();
    if (searchTerm) {
      params['return_search'] = searchTerm;
    }

    if (window.scrollY > 0) {
      params['return_scroll'] = String(window.scrollY);
    }

    return params;
  }

  isDistrictOpen(districtId: number): boolean {
    return this.expandedDistrictId() === districtId;
  }

  updateSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchTerm.set(searchTerm);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  canViewPersonalReports(): boolean {
    return this.hasAllDepartmentAccess ||
      (Number(this.authService.getCurrentUser()?.department_id) === this.personalReportGroupDepartmentId
        && ['assistant', 'administrative assistant', 'director'].includes(this.normalizedRole));
  }

  get showDistrictPastorReport(): boolean {
    const hasPersonalReportDepartment = this.hasAllDepartmentAccess
      ? this.departments().some(
          department => Number(department.department_id) === this.personalReportGroupDepartmentId
        )
      : this.activeDepartmentId === this.personalReportGroupDepartmentId;

    return hasPersonalReportDepartment &&
      ['assistant', 'administrative assistant', 'head assistant', 'director', 'head director']
        .includes(this.normalizedRole);
  }

  get showDistrictPersonalReportLinks(): boolean {
    if (
      this.hasAllDepartmentAccess ||
      this.activeDepartmentId !== this.personalReportGroupDepartmentId
    ) {
      return false;
    }

    return (
      this.isAssistantPortal &&
      ['assistant', 'administrative assistant', 'head assistant']
        .includes(this.normalizedRole)
    ) || (
      this.isDirectorPortal &&
      this.normalizedRole === 'director'
    );
  }

  get isDirectorPersonalReportOnly(): boolean {
    return this.isDirectorPortal && this.showDistrictPersonalReportLinks;
  }

  private get activeDepartmentId(): number {
    return Number(this.authService.getCurrentUser()?.department_id);
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
      queryParams: this.monitoringReturnParams(departmentId)
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

  getDistrictPastorQuarterStatus(
    districtId: number,
    quarter: 'q1' | 'q2' | 'q3' | 'q4'
  ): MonitoringAlert {
    const status = this.getQuarterStatus({
      church_id: districtId,
      name: 'District Pastor Report',
      address: null,
      parent_id: null,
      monitoring: this.districtPastorMonitoring()[districtId]
    }, quarter);

    if (status && ['Approved', 'Endorsed', 'Submitted'].includes(status.status)) {
      return status;
    }

    return {
      quarter: quarter.toUpperCase(),
      status: 'Not submitted',
      tone: 'not-started'
    };
  }

  openDistrict(
    districtid: number
  ): void {


    const prefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';

    this.router.navigate([`${prefix}/reports/details`, districtid], {
      queryParams: this.monitoringReturnParams()
    });
  }

  createReportTemplate(): void {
    this.router.navigate(['/assistant/reports/new']);
  }

  get isAssistantPortal(): boolean {
    return this.router.url.startsWith('/assistant');
  }

  get canCreateReportTemplate(): boolean {
    return this.isAssistantPortal && this.normalizedRole !== 'head assistant';
  }

  get isDirectorPortal(): boolean {
    return this.router.url.startsWith('/director');
  }

  private get isDepartmentScopedPortal(): boolean {
    return this.isAssistantPortal || this.isDirectorPortal;
  }

  get isDirectorRole(): boolean {
    return ['director', 'head director'].includes(this.normalizedRole);
  }

  get canViewReportSummary(): boolean {
    return this.isDirectorRole ||
      ['assistant', 'administrative assistant', 'head assistant'].includes(this.normalizedRole);
  }

  openMissionSummary(): void {
    const portalPrefix = this.isAssistantPortal ? '/assistant' : '/director';
    void this.router.navigate([`${portalPrefix}/reports/summary`], {
      queryParams: { year: this.selectedYear() }
    });
  }
}