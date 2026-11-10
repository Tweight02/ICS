import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { CURRENT_REPORT_YEAR } from '../../../../core/utils/report-year';
import { Reports } from './reports';

describe('Reports', () => {
  let component: Reports;
  let fixture: ComponentFixture<Reports>;
  let currentUser: User;
  let routerUrl: string;
  let returnQueryParams: Record<string, string>;
  let navigation: {
    commands: Array<string | number>;
    extras?: { queryParams?: Record<string, string> };
  } | undefined;
  let getChurches: ReturnType<typeof vi.fn>;
  let getDistricts: ReturnType<typeof vi.fn>;
  let getDepartments: ReturnType<typeof vi.fn>;
  let getMissionReportSummary: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigation = undefined;
    routerUrl = '/assistant/reports';
    returnQueryParams = {};
    getDistricts = vi.fn().mockReturnValue(of({
      success: true,
      data: [{
        church_id: 7,
        name: 'North District',
        address: null,
        parent_id: null,
        church_count: 1,
        q1: 50
      }]
    }));
    getDepartments = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { department_id: 16, department_name: 'Ministerial & Evangelism' },
        { department_id: 17, department_name: 'Youth Ministries' },
        { department_id: 18, department_name: 'Adventist Mission' },
        { department_id: 19, department_name: 'Baptism Record' },
        { department_id: 20, department_name: 'Death Record' },
        { department_id: 21, department_name: 'Communication' }
      ]
    }));
    getMissionReportSummary = vi.fn().mockReturnValue(of({
      success: true,
      data: {
        year: String(CURRENT_REPORT_YEAR),
        total_submitted_reports: 12,
        total_report_value: 345,
        departments: []
      }
    }));
    getChurches = vi.fn().mockReturnValue(of({
      success: true,
      district: {
        church_id: 7,
        name: 'North District',
        address: null,
        parent_id: null,
        monitoring: {
          q1: 50,
          q1_submitted: true,
          q2: null,
          q3: null,
          q4: null
        }
      },
      data: [{
        church_id: 8,
        name: 'Pasuc',
        address: null,
        parent_id: 7,
        monitoring_by_department: {
          16: {
            q1: null, q2: null, q3: null, q4: null,
            q1_approved: false, q2_approved: false, q3_approved: false, q4_approved: false,
            q1_endorsed: false, q2_endorsed: false, q3_endorsed: false, q4_endorsed: false,
            q1_submitted: false, q2_submitted: false, q3_submitted: false, q4_submitted: false
          },
          17: {
            q1: 50, q1_approved: false, q1_submitted: false,
            q2: 100, q2_approved: false, q2_submitted: true,
            q3: 100, q3_approved: true, q3_submitted: true,
            q4: null, q4_endorsed: true
          },
          21: {
            q1: null, q2: null, q3: null, q4: null,
            q1_approved: false, q2_approved: false, q3_approved: false, q4_approved: false,
            q1_endorsed: false, q2_endorsed: false, q3_endorsed: false, q4_endorsed: false,
            q1_submitted: false, q2_submitted: false, q3_submitted: false, q4_submitted: false
          }
        },
        monitoring: {
          q1: 50,
          q1_approved: false,
          q1_submitted: false,
          q2: 100,
          q2_approved: false,
          q2_submitted: true,
          q3: 100,
          q3_approved: true,
          q3_submitted: true,
          q4: null,
          q4_endorsed: true
        }
      }]
    }));
    currentUser = {
      user_id: 1,
      first_name: 'Assistant',
      last_name: 'User',
      email: 'assistant@example.com',
      role: 'assistant',
      department_id: 16
    };

    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        { provide: AuthService, useValue: { getCurrentUser: () => currentUser } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return {
                  get: (key: string) => returnQueryParams[key] ?? null
                };
              }
            }
          }
        },
        {
          provide: ChurchService,
          useValue: {
            getDistricts,
            getChurches,
            getDepartments,
            getMissionReportSummary
          }
        },
        {
          provide: Router,
          useValue: {
            get url() {
              return routerUrl;
            },
            navigate: (
              commands: Array<string | number>,
              extras?: { queryParams?: Record<string, string> }
            ) => {
              navigation = { commands, extras };
              return Promise.resolve(true);
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows Ministerial & Evangelism assistants to view personal reports', () => {
    expect(component.personalReportGroupDepartmentId).toBe(16);
    expect(component.canViewPersonalReports()).toBe(true);
  });

  it('hides personal report departments from assistants outside Ministerial & Evangelism', () => {
    currentUser.department_id = 20;

    expect(component.canViewPersonalReports()).toBe(false);
  });

  it('opens the selected church report for the signed-in assistant department', () => {
    component.openChurch(7, 8);

    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 16, 7, 8],
      extras: { queryParams: { return_to: 'monitoring', year: String(CURRENT_REPORT_YEAR), return_department: '16' } }
    });
  });

  it('shows department monitoring without a department selector to Head Assistants', () => {
    currentUser.role = 'head assistant';
    currentUser.department_id = 17;

    component.loadDepartmentOptions();

    expect(component.hasAllDepartmentAccess).toBe(true);
    expect(getDepartments).toHaveBeenCalled();
    expect(component.departments().map(department => department.department_name)).toEqual([
      'Ministerial & Evangelism',
      'Youth Ministries',
      'Communication'
    ]);
    expect(getDistricts).toHaveBeenLastCalledWith(undefined, CURRENT_REPORT_YEAR);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#report-department-filter')).toBeNull();
    expect(component.canCreateReportTemplate).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('New report');

    component.toggleDistrict(7);
    component.toggleChurch(7, 8);
    fixture.detectChanges();
    expect(getChurches).toHaveBeenCalledOnce();
    expect(getChurches).toHaveBeenCalledWith(7, undefined, CURRENT_REPORT_YEAR, true);
    expect(
      fixture.nativeElement.querySelectorAll('[id^="church-departments-"] tbody tr')
    ).toHaveLength(2);
    const churchMonitoringTable = fixture.nativeElement.querySelector(
      '[id^="church-departments-"]'
    ) as HTMLElement;
    expect(churchMonitoringTable.textContent).not.toContain('Ministerial & Evangelism');
    expect(churchMonitoringTable.textContent).not.toContain('Adventist Mission');
    expect(churchMonitoringTable.textContent).not.toContain('Baptism Record');
    expect(churchMonitoringTable.textContent).not.toContain('Death Record');

    component.openDepartmentQuarterReport(7, 8, 21, 'q3');
    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 21, 7, 8],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '21',
          return_expanded: '7',
          return_church: '8',
          quarter: 'Q3'
        }
      }
    });
  });

  it('shows New report to regular assistants', () => {
    currentUser.role = 'assistant';
    fixture.detectChanges();

    expect(component.canCreateReportTemplate).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('New report');
  });

  it('defaults Head Assistants to Ministerial & Evangelism using the API department ID', () => {
    currentUser.role = 'head assistant';
    getDepartments.mockReturnValueOnce(of({
      success: true,
      data: [
        { department_id: 16, department_name: 'Children and Family Ministries' },
        { department_id: 99, department_name: 'Ministerial & Evangelism' },
        { department_id: 19, department_name: 'Communication' }
      ]
    }));

    component.loadDepartmentOptions();

    expect(component.personalReportGroupDepartmentId).toBe(99);
    expect(getDistricts).toHaveBeenLastCalledWith(undefined, CURRENT_REPORT_YEAR);
  });

  it('keeps Directors scoped to their assigned department', () => {
    currentUser.role = 'director';
    currentUser.department_id = 17;
    routerUrl = '/director/reports';
    fixture.destroy();
    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.hasAllDepartmentAccess).toBe(false);
    expect(getDistricts).toHaveBeenLastCalledWith(17, CURRENT_REPORT_YEAR);
    expect(fixture.nativeElement.querySelector('#report-department-filter')).toBeNull();
  });

  it('shows Directors a navigation button for the mission-wide report summary', () => {
    fixture.destroy();
    currentUser.role = 'director';
    routerUrl = '/director/reports';
    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
    expect(component.isDirectorRole).toBe(true);
    fixture.detectChanges();

    expect(getMissionReportSummary).not.toHaveBeenCalled();
    const summaryButton = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;
    expect(summaryButton.textContent).toContain('Report summary');

    component.openMissionSummary();
    expect(navigation).toEqual({
      commands: ['/director/reports/summary'],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '16'
        }
      }
    });
  });

  it('shows assistants a button for the all-department summary', () => {
    fixture.detectChanges();

    const summaryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Report summary')) as
      HTMLButtonElement | undefined;
    expect(summaryButton).toBeDefined();
    const newReportButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('New report'));
    expect(newReportButton?.parentElement).toBe(summaryButton?.parentElement);
    expect(summaryButton?.parentElement?.classList.contains('gap-3')).toBe(true);

    component.openMissionSummary();
    expect(navigation).toEqual({
      commands: ['/assistant/reports/summary'],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '16'
        }
      }
    });
  });

  it('keeps the year filter above the loading skeleton', () => {
    getDistricts.mockReturnValue(NEVER);

    component.loadDistricts();
    fixture.detectChanges();

    const yearFilter = fixture.nativeElement.querySelector(
      '#report-year-filter'
    ) as HTMLSelectElement | null;
    const loadingStatus = fixture.nativeElement.querySelector(
      '[aria-label="Loading report monitoring"]'
    ) as HTMLElement | null;

    expect(yearFilter).not.toBeNull();
    expect(loadingStatus).not.toBeNull();
    expect(
      yearFilter!.closest('section')!.compareDocumentPosition(loadingStatus!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('gives an assistant without a department access to every department', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    component.loadDepartmentOptions();

    expect(component.hasAllDepartmentAccess).toBe(true);
    expect(component.departments().length).toBeGreaterThan(0);
    expect(getDistricts).toHaveBeenLastCalledWith(undefined, CURRENT_REPORT_YEAR);
  });

  it('keeps Head Directors scoped to their assigned department', () => {
    currentUser.role = 'head director';
    currentUser.department_id = 17;
    routerUrl = '/director/reports';
    fixture.destroy();
    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;

    fixture.detectChanges();
    component.openChurch(7, 8);

    expect(component.hasAllDepartmentAccess).toBe(false);
    expect(getDistricts).toHaveBeenLastCalledWith(17, CURRENT_REPORT_YEAR);
    expect(navigation).toEqual({
      commands: ['/director/reports/particulars', 17, 7, 8],
      extras: { queryParams: { return_to: 'monitoring', year: String(CURRENT_REPORT_YEAR), return_department: '17' } }
    });
  });

  it('opens the records report directly for a baptism or death department', () => {
    currentUser.department_id = 22;

    component.openChurch(7, 8);

    expect(navigation).toEqual({
      commands: ['/assistant/reports/records', 22, 7, 8],
      extras: { queryParams: { return_to: 'monitoring', year: String(CURRENT_REPORT_YEAR), return_department: '22' } }
    });
  });

  it('shows an error instead of navigating when the assistant department is missing', () => {
    currentUser.department_id = undefined;

    component.openChurch(7, 8);

    expect(navigation).toBeUndefined();
    expect(component.errorMessage()).toContain('Your department is unavailable');
  });

  it('shows District Pastor Report first in the church list for M&E assistants', () => {
    expect(getDistricts).toHaveBeenCalledWith(16, CURRENT_REPORT_YEAR);
    fixture.detectChanges();

    const districtRow = fixture.nativeElement.querySelector(
      'button[aria-expanded="false"]'
    ) as HTMLButtonElement;
    districtRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(getChurches).toHaveBeenCalledWith(7, 16, CURRENT_REPORT_YEAR);
    expect(component.expandedDistrictId()).toBe(7);
    const personalReportButton = fixture.nativeElement.querySelector(
      '[aria-label="Open District Pastor Report for North District"]'
    ) as HTMLButtonElement;
    const firstChurchButton = personalReportButton.nextElementSibling
      ?.querySelector('button') as HTMLButtonElement;
    expect(personalReportButton.textContent).toContain('District Pastor Report');
    expect(firstChurchButton.textContent).toContain('Pasuc');
    personalReportButton.click();

    expect(navigation).toEqual({
      commands: ['/assistant/reports/records', 16, 7, 7],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '16',
          return_expanded: '7'
        }
      }
    });
  });

  it('shows only quarter monitoring for M&E directors', () => {
    currentUser.role = 'director';
    currentUser.department_id = 16;
    routerUrl = '/director/reports';
    fixture.destroy();
    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const districtRow = fixture.nativeElement.querySelector(
      'button[aria-expanded="false"]'
    ) as HTMLButtonElement;
    districtRow.click();
    fixture.detectChanges();

    expect(component.isDirectorPersonalReportOnly).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Pasuc');
    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Open District Pastor Report for North District"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[id^="church-departments-"]')
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Open Q1 District Pastor Report for North District"]'
      )
    ).not.toBeNull();
  });

  it('uses the requested four labels for District Pastor Report quarter statuses', () => {
    component.districtPastorMonitoring.set({
      7: {
        q1: null,
        q1_approved: true,
        q2: null,
        q2_endorsed: true,
        q3: null,
        q3_submitted: true,
        q4: null
      }
    });

    expect(component.getDistrictPastorQuarterStatus(7, 'q1').status).toBe('Approved');
    expect(component.getDistrictPastorQuarterStatus(7, 'q2').status).toBe('Endorsed');
    expect(component.getDistrictPastorQuarterStatus(7, 'q3').status).toBe('Submitted');
    expect(component.getDistrictPastorQuarterStatus(7, 'q4').status).toBe('Not submitted');
    expect(component.getDistrictPastorQuarterStatus(8, 'q1').status).toBe('Not submitted');
  });

  it('opens the district personal report from its quarter monitoring cell', () => {
    component.openDistrictPastorReport(7, 'q3');

    expect(navigation).toEqual({
      commands: ['/assistant/reports/records', 16, 7, 7],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '16',
          quarter: 'Q3'
        }
      }
    });
  });

  it('restores search and expanded church from monitoring return state', () => {
    currentUser.role = 'head assistant';
    currentUser.department_id = 17;
    returnQueryParams = {
      return_to: 'monitoring',
      return_department: '17',
      return_expanded: '7',
      return_church: '8',
      return_search: 'North'
    };

    component.loadDepartmentOptions();

    expect(component.searchTerm()).toBe('North');
    expect(component.expandedDistrictId()).toBe(7);
    expect(component.isChurchOpen(7, 8)).toBe(true);
    expect(getChurches).toHaveBeenCalledWith(7, undefined, CURRENT_REPORT_YEAR, true);
  });

  it('restores a department-assigned assistant user’s monitoring search and scroll state', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = 17;
    returnQueryParams = {
      return_to: 'monitoring',
      return_department: '17',
      return_search: 'North'
    };

    component.loadDistricts();

    expect(component.searchTerm()).toBe('North');
    expect(getDistricts).toHaveBeenLastCalledWith(17, CURRENT_REPORT_YEAR);
  });

  it('removes temporary return parameters after restoring monitoring state', async () => {
    returnQueryParams = {
      year: String(CURRENT_REPORT_YEAR),
      return_to: 'monitoring',
      return_department: '17',
      return_expanded: '7',
      return_church: '8',
      return_search: 'North',
      return_scroll: '120'
    };
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    component.loadDistricts();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(component.searchTerm()).toBe('North');
    expect(component.expandedDistrictId()).toBe(7);
    expect(component.isChurchOpen(7, 8)).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(0, 120);
    expect(navigation?.commands).toEqual([]);
    expect(navigation?.extras).toMatchObject({
      queryParams: {
        return_to: null,
        return_department: null,
        return_expanded: null,
        return_church: null,
        return_search: null,
        return_scroll: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    scrollTo.mockRestore();
  });

  it('shows the signed-in department in the nested church accordion', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    component.toggleChurch(7, 8);
    fixture.detectChanges();

    expect(getChurches).toHaveBeenCalledWith(7, 17, CURRENT_REPORT_YEAR);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('lets Head Assistants open an M&E quarter without selecting a department first', () => {
    currentUser.role = 'head assistant';
    currentUser.department_id = undefined;
    component.loadDepartmentOptions();

    component.openDepartmentQuarterReport(7, 8, 16, 'q2');
    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 16, 7, 8],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '16',
          quarter: 'Q2'
        }
      }
    });
  });

  it('shows church quarter updates and status in non-M&E assistant monitoring', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    component.toggleChurch(7, 8);
    fixture.detectChanges();

    const quarterStatuses = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr td button')
    ) as HTMLElement[];
    expect(quarterStatuses).toHaveLength(4);
    expect(quarterStatuses[0].textContent).toContain('In progress');
    expect(quarterStatuses[1].textContent).toContain('Submitted');
    expect(quarterStatuses[2].querySelector('[aria-label="Approved"]')?.textContent).toContain('✓');
    expect(quarterStatuses[3].textContent).toContain('Endorsed');
  });

  it('filters district names without eagerly loading every district church list', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    const searchInput = fixture.nativeElement.querySelector(
      '[aria-label="Search districts"]'
    ) as HTMLInputElement;
    searchInput.value = 'North';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(getChurches).not.toHaveBeenCalled();
    expect(component.filteredDistricts().map(district => district.name))
      .toEqual(['North District']);
  });

  it('opens the selected department and quarter from the church monitoring table', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    component.toggleChurch(7, 8);
    fixture.detectChanges();

    const quarterButton = fixture.nativeElement.querySelector(
      '[aria-label="Open Q1 report for Department 17 at Pasuc"]'
    ) as HTMLButtonElement;
    quarterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 17, 7, 8],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '17',
          return_expanded: '7',
          return_church: '8',
          quarter: 'Q1'
        }
      }
    });
  });

  it('opens a department quarter report from its quarter button', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    component.toggleChurch(7, 8);
    fixture.detectChanges();

    const quarterButton = fixture.nativeElement.querySelector(
      '[aria-label="Open Q1 report for Department 17 at Pasuc"]'
    ) as HTMLButtonElement;
    quarterButton.click();

    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 17, 7, 8],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '17',
          return_expanded: '7',
          return_church: '8',
          quarter: 'Q1'
        }
      }
    });
  });

  it('shows a check when a quarter is approved even without progress data', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    fixture.detectChanges();

    const church = component.districtChurches()[7][0];
    church.monitoring!.q1 = null;
    church.monitoring!.q1_approved = true;

    expect(component.getQuarterStatus(church, 'q1')).toEqual({
      quarter: 'Q1',
      status: 'Approved',
      tone: 'complete'
    });
  });

  it('reloads monitoring when the selected reporting year changes', () => {
    currentUser.department_id = 17;
    component.selectYear(CURRENT_REPORT_YEAR - 1);

    expect(component.selectedYear()).toBe(CURRENT_REPORT_YEAR - 1);
    expect(getDistricts).toHaveBeenLastCalledWith(17, CURRENT_REPORT_YEAR - 1);
    expect(component.districtChurches()).toEqual({});
    expect(component.expandedDistrictId()).toBeNull();
  });
});
