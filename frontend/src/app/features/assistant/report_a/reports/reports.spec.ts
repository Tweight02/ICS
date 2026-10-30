import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
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
            getDepartments
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

  it('lets Head Assistants select and open reports for any department', () => {
    currentUser.role = 'head assistant';
    currentUser.department_id = 17;

    component.loadDepartmentOptions();

    expect(component.hasAllDepartmentAccess).toBe(true);
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(component.departments().map(department => department.department_name)).toEqual([
      'Ministerial & Evangelism',
      'Youth Ministries',
      'Communication'
    ]);
    expect(component.selectedDepartmentId()).toBe(16);
    expect(getDistricts).toHaveBeenLastCalledWith(16, CURRENT_REPORT_YEAR);
    fixture.detectChanges();
    const departmentSelect = fixture.nativeElement.querySelector(
      '#report-department-filter'
    ) as HTMLSelectElement;
    expect(departmentSelect.value).toBe('16');
    expect(departmentSelect.selectedOptions[0].textContent.trim())
      .toBe('Ministerial & Evangelism');
    expect(component.canCreateReportTemplate).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('New report');

    component.selectDepartment(21);
    component.openChurch(7, 8);

    expect(getDistricts).toHaveBeenLastCalledWith(21, CURRENT_REPORT_YEAR);
    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 21, 7, 8],
      extras: { queryParams: { return_to: 'monitoring', year: String(CURRENT_REPORT_YEAR), return_department: '21' } }
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

    expect(component.selectedDepartmentId()).toBe(99);
    expect(component.personalReportGroupDepartmentId).toBe(99);
    expect(getDistricts).toHaveBeenLastCalledWith(99, CURRENT_REPORT_YEAR);
  });

  it('keeps Directors scoped to their assigned department', () => {
    currentUser.role = 'director';
    currentUser.department_id = 17;
    routerUrl = '/director/reports';

    component.loadDistricts();
    fixture.detectChanges();

    expect(component.hasAllDepartmentAccess).toBe(false);
    expect(getDepartments).not.toHaveBeenCalled();
    expect(getDistricts).toHaveBeenLastCalledWith(17, CURRENT_REPORT_YEAR);
    expect(fixture.nativeElement.querySelector('#report-department-filter')).toBeNull();
  });

  it('lets Head Directors select and open reports for any department', () => {
    currentUser.role = 'head director';
    currentUser.department_id = 16;
    routerUrl = '/director/reports';

    component.loadDepartmentOptions();
    component.selectDepartment(17);
    component.openChurch(7, 8);

    expect(component.hasAllDepartmentAccess).toBe(true);
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(component.departments()).toHaveLength(6);
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

  it('opens the selected district personal report directly for M&E assistants', () => {
    expect(getDistricts).toHaveBeenCalledWith(16, CURRENT_REPORT_YEAR);
    fixture.detectChanges();

    const districtRow = fixture.nativeElement.querySelector(
      '[aria-label="Open personal report for North District"]'
    ) as HTMLButtonElement;
    districtRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(getChurches).not.toHaveBeenCalled();
    expect(districtRow.hasAttribute('aria-expanded')).toBe(false);
    expect(component.expandedDistrictId()).toBeNull();
    expect(navigation).toEqual({
      commands: ['/assistant/reports/records', 16, 7, 7],
      extras: { queryParams: { return_to: 'monitoring', year: String(CURRENT_REPORT_YEAR), return_department: '16' } }
    });
  });

  it('restores selected department, search, and expanded district from monitoring return state', () => {
    currentUser.role = 'head assistant';
    currentUser.department_id = 17;
    returnQueryParams = {
      return_to: 'monitoring',
      return_department: '17',
      return_expanded: '7',
      return_search: 'North'
    };

    component.loadDepartmentOptions();

    expect(component.selectedDepartmentId()).toBe(17);
    expect(component.searchTerm()).toBe('North');
    expect(component.expandedDistrictId()).toBe(7);
    expect(getChurches).toHaveBeenCalledWith(7, 17, CURRENT_REPORT_YEAR);
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

  it('keeps district accordion monitoring for other assistant departments', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    fixture.detectChanges();

    expect(getChurches).toHaveBeenCalledWith(7, 17, CURRENT_REPORT_YEAR);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('opens the personal report directly when a Head Assistant selects M&E', () => {
    currentUser.role = 'head assistant';
    currentUser.department_id = undefined;
    component.loadDepartmentOptions();
    component.selectDepartment(16);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Open personal report for North District"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(getChurches).not.toHaveBeenCalled();
    expect(navigation).toEqual({
      commands: ['/assistant/reports/records', 16, 7, 7],
      extras: { queryParams: { return_to: 'monitoring', year: String(CURRENT_REPORT_YEAR), return_department: '16' } }
    });
  });

  it('shows church quarter updates and status in non-M&E assistant monitoring', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    fixture.detectChanges();

    const churchRows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(churchRows).toHaveLength(1);
    const quarterStatuses = Array.from(
      churchRows[0].querySelectorAll('[title$="status"]')
    ) as HTMLElement[];
    expect(quarterStatuses).toHaveLength(4);
    expect(quarterStatuses[0].textContent).toContain('In progress');
    expect(quarterStatuses[1].textContent).toContain('Submitted');
    expect(quarterStatuses[2].querySelector('[aria-label="Approved"]')?.textContent).toContain('✓');
    expect(quarterStatuses[3].textContent).toContain('Endorsed');
  });

  it('finds districts by the name of a church in the district', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    const searchInput = fixture.nativeElement.querySelector(
      '[aria-label="Search districts"]'
    ) as HTMLInputElement;
    searchInput.value = 'Pasuc';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(getChurches).toHaveBeenCalledWith(7, 17, CURRENT_REPORT_YEAR);
    expect(component.filteredDistricts().map(district => district.name))
      .toEqual(['North District']);
  });

  it('opens the church report when its monitoring row is clicked', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    fixture.detectChanges();

    const churchRow = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    churchRow.querySelector('td')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 17, 7, 8],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '17',
          return_expanded: '7'
        }
      }
    });
  });

  it('opens the church report when its monitoring row is activated by keyboard', () => {
    currentUser.department_id = 17;
    component.loadDistricts();
    component.toggleDistrict(7);
    fixture.detectChanges();

    const churchRow = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    churchRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(navigation).toEqual({
      commands: ['/assistant/reports/particulars', 17, 7, 8],
      extras: {
        queryParams: {
          return_to: 'monitoring',
          year: String(CURRENT_REPORT_YEAR),
          return_department: '17',
          return_expanded: '7'
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
