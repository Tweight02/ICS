import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { DeathbapComponent } from './deathbap';

describe('Deathbap', () => {
  let component: DeathbapComponent;
  let fixture: ComponentFixture<DeathbapComponent>;
  let httpGet: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let returnQueryParams: Record<string, string>;
  let currentUser: { role: string; user_id: number };
  let routerUrl: string;
  let routeParams: Record<string, string>;
  let getDepartmentComments: ReturnType<typeof vi.fn>;
  let getDepartmentReport: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    httpGet = vi.fn().mockReturnValue(of({ data: [] }));
    navigate = vi.fn();
    getDepartmentComments = vi.fn().mockReturnValue(of({ data: [] }));
    getDepartmentReport = vi.fn().mockReturnValue(of({ programs: [] }));
    returnQueryParams = {};
    routeParams = {};
    currentUser = { role: 'pastor', user_id: 1 };
    routerUrl = '/pastor/deathbap';
    await TestBed.configureTestingModule({
      imports: [DeathbapComponent],
      providers: [
        { provide: HttpClient, useValue: { get: httpGet } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => routeParams[key] ?? null
              },
              get queryParamMap() {
                return { get: (key: string) => returnQueryParams[key] ?? null };
              }
            }
          }
        },
        { provide: Router, useValue: { get url() { return routerUrl; }, navigate } },
        { provide: AuthService, useValue: { getCurrentUser: () => currentUser } },
        {
          provide: ChurchService,
          useValue: {
            getMyDistrictChurches: () => of({
              success: true,
              district: { church_id: 1, name: 'District', address: '', parent_id: null },
              data: []
            })
          }
        },
        {
          provide: ReportService,
          useValue: { getDepartmentComments, getDepartmentReport }
        }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeathbapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the report-summary hero header for read-only District Pastor Reports', () => {
    component.departmentId = 16;
    component.selectedRecord = 'ministerial';
    component.isReadOnly = true;
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('header.relative.isolate') as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.textContent).toContain('District pastor report');
    expect(header.textContent).toContain('District Pastor Report');
    expect(header.querySelector('img[src="/assets/headerMountain.png"]')).not.toBeNull();
    expect(header.querySelector('button')?.textContent).toContain('Back to reports');
    expect(fixture.nativeElement.textContent).not.toContain('PERSONAL REPORTS');
  });

  it.each([
    ['22', 'baptism'],
    ['23', 'death']
  ])('opens %s records on the requested report quarter', (departmentId, recordType) => {
    routeParams = {
      departmentId,
      districtId: '8',
      churchId: '9'
    };
    returnQueryParams = {
      year: '2026',
      quarter: 'Q4'
    };

    component.ngOnInit();

    expect(component.selectedRecord).toBe(recordType);
    expect(component.selectedYear).toBe(2026);
    expect(component.selectedQuarter).toBe('Q4');
    expect(component.isAnnualView).toBe(false);
  });

  it('shows one district-owned report for both Pastor personal report types', () => {
    component.churches = [
      { church_id: 2, name: 'Church One', address: '', parent_id: 1 },
      { church_id: 3, name: 'Church Two', address: '', parent_id: 1 }
    ];
    component.districtId = 1;
    component.districtName = 'North District';
    component.isReadOnly = false;

    for (const reportType of ['ministerial', 'mission'] as const) {
      component.selectedRecord = reportType;

      expect(component.reportChurches).toEqual([{
        church_id: 1,
        name: 'North District',
        address: '',
        parent_id: null
      }]);
      expect(component.reportChurches[0]).toBe(component.reportChurches[0]);
    }
  });

  it('shows the Baptism quarter table and selected-quarter records for read-only M and E reports', () => {
    component.departmentId = 16;
    component.isReadOnly = true;
    component.selectedRecord = 'baptism';
    component.selectedYear = 2026;
    component.churches = [
      { church_id: 9, name: 'North Church', address: '', parent_id: 8 }
    ];
    component.baptisms = [
      {
        baptism_id: 3,
        church_id: 9,
        quarter: 'Q1',
        first_name: 'Member',
        middle_name: null,
        last_name: 'Example',
        extension_name: null,
        birthdate: '1990-01-01',
        gender: 'other',
        address: 'Example address',
        officiating_minister: 'Pastor Example',
        place_of_baptism: 'North Church',
        date_of_baptism: '2026-01-01',
        marital_status: 'single',
        is_reclaimed: false
      },
      {
        baptism_id: 4,
        church_id: 9,
        quarter: 'Q2',
        first_name: 'Other',
        middle_name: null,
        last_name: 'Member',
        extension_name: null,
        birthdate: '1991-01-01',
        gender: 'other',
        address: 'Example address',
        officiating_minister: 'Pastor Example',
        place_of_baptism: 'North Church',
        date_of_baptism: '2026-04-01',
        marital_status: 'single',
        is_reclaimed: false
      }
    ];
    fixture.detectChanges();

    expect(component.districtBaptismQuarterTotals).toEqual({
      Q1: 1,
      Q2: 1,
      Q3: 0,
      Q4: 0
    });
    expect(fixture.nativeElement.querySelector('#district-personal-records')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="recordSearch"]')).toBeNull();

    const quarterButton = fixture.nativeElement.querySelector(
      '#district-personal-report-summary button[aria-controls="district-personal-records"]'
    ) as HTMLButtonElement;
    quarterButton.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('#district-personal-records') as HTMLElement;
    expect(details.textContent).toContain('Q1 baptism records');
    expect(details.textContent).toContain('Member Example');
    expect(details.textContent).toContain('North Church');
    expect(details.querySelector('table tbody tr[role="button"]')).not.toBeNull();
  });

  it('shows death records when a read-only M and E report quarter is selected', () => {
    component.departmentId = 16;
    component.isReadOnly = true;
    component.selectedRecord = 'death';
    component.selectedYear = 2026;
    component.churches = [
      { church_id: 9, name: 'North Church', address: '', parent_id: 8 }
    ];
    const baptism = {
      baptism_id: 3,
      church_id: 9,
      quarter: 'Q1',
      first_name: 'Member',
      middle_name: null,
      last_name: 'Example',
      extension_name: null,
      birthdate: '1990-01-01',
      gender: 'other',
      address: 'Example address',
      officiating_minister: 'Pastor Example',
      place_of_baptism: 'North Church',
      date_of_baptism: '2026-01-01',
      marital_status: 'single',
      is_reclaimed: false
    };
    component.baptisms = [baptism];
    component.deaths = [{
      death_id: 4,
      baptism_id: 3,
      quarter: 'Q1',
      date_of_death: '2026-02-01',
      baptism
    }];
    fixture.detectChanges();

    expect(component.districtDeathQuarterTotals.Q1).toBe(1);
    const quarterButton = fixture.nativeElement.querySelector(
      '#district-personal-report-summary button[aria-controls="district-personal-records"]'
    ) as HTMLButtonElement;
    quarterButton.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('#district-personal-records') as HTMLElement;
    expect(details.textContent).toContain('Q1 death records');
    expect(details.textContent).toContain('Member Example');
    expect(details.textContent).toContain('North Church');
  });

  it('keeps the existing record controls for Pastor personal reports', () => {
    component.departmentId = 16;
    component.isReadOnly = false;
    component.selectedRecord = 'baptism';
    fixture.detectChanges();

    expect(component.isDistrictPersonalSummaryTab).toBe(false);
    expect(fixture.nativeElement.querySelector('#district-personal-report-summary')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="recordSearch"]')).not.toBeNull();
    const exportButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Export / Print'));
    expect(exportButton).toBeTruthy();

    exportButton?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-labelledby="personal-record-preview-title"]'))
      .not.toBeNull();
  });

  it('builds the baptism export from all currently displayed records', () => {
    component.selectedRecord = 'baptism';
    component.selectedYear = 2026;
    component.selectedQuarter = 'Q1';
    component.baptisms = [{
      baptism_id: 3,
      church_id: 9,
      quarter: 'Q1',
      first_name: 'Member',
      middle_name: null,
      last_name: 'Example',
      extension_name: null,
      birthdate: '1990-01-01',
      gender: 'other',
      address: 'Example address',
      officiating_minister: 'Pastor Example',
      place_of_baptism: 'North Church',
      date_of_baptism: '2026-01-01',
      marital_status: 'single',
      is_reclaimed: false
    }];

    const rows = component.buildPersonalRecordExportRows();

    expect(rows[4]).toEqual([
      'No.',
      'Name',
      'Church',
      'Date of Baptism',
      'Officiating Minister',
      'Place of Baptism',
      'Gender'
    ]);
    expect(rows[5]).toEqual([
      1,
      'Member Example',
      'Unknown Church',
      'January 1, 2026',
      'Pastor Example',
      'North Church',
      'other'
    ]);
  });

  it('builds an annual death summary export for the district view', () => {
    component.departmentId = 16;
    component.isReadOnly = true;
    component.selectedRecord = 'death';
    component.selectedYear = 2026;
    component.deaths = [{
      death_id: 4,
      baptism_id: 3,
      quarter: 'Q1',
      date_of_death: '2026-02-01',
      baptism: {
        baptism_id: 3,
        church_id: 9,
        quarter: 'Q1',
        first_name: 'Member',
        middle_name: null,
        last_name: 'Example',
        extension_name: null,
        birthdate: '1990-01-01',
        gender: 'other',
        address: 'Example address',
        officiating_minister: 'Pastor Example',
        place_of_baptism: 'North Church',
        date_of_baptism: '1990-01-01',
        marital_status: 'single',
        is_reclaimed: false
      }
    }];

    const rows = component.buildPersonalRecordExportRows();

    expect(rows[4]).toEqual(['Quarter', 'Deaths Reported']);
    expect(rows.slice(5)).toEqual([
      ['Q1', 1],
      ['Q2', 0],
      ['Q3', 0],
      ['Q4', 0],
      ['Total', 1]
    ]);
  });

  it('keeps read-only personal reports scoped to the routed church', () => {
    component.churches = [
      { church_id: 2, name: 'Church One', address: '', parent_id: 1 },
      { church_id: 3, name: 'Church Two', address: '', parent_id: 1 }
    ];
    component.selectedRecord = 'ministerial';
    component.isReadOnly = true;
    component.churchId = 3;

    expect(component.reportChurches.map(church => church.name))
      .toEqual(['Church Two']);
  });

  it('loads records for the selected district when opened by a Head Assistant', () => {
    currentUser.role = 'head assistant';
    component.isReadOnly = true;
    component.departmentId = 16;
    component.districtId = 8;
    httpGet.mockClear();

    component.loadBaptisms();
    component.loadDeaths();

    expect(httpGet).toHaveBeenCalledWith('/api/baptisms', {
      params: { district_id: 8 }
    });
    expect(httpGet).toHaveBeenCalledWith('/api/deaths', {
      params: { district_id: 8 }
    });
  });

  it('loads district records for an M and E assistant and includes child-church records', () => {
    currentUser.role = 'assistant';
    component.isReadOnly = true;
    component.departmentId = 16;
    component.districtId = 8;
    component.churchId = 8;
    component.selectedYear = 2026;
    component.selectedQuarter = 'Q1';
    httpGet.mockClear();

    component.loadBaptisms();
    component.loadDeaths();

    component.baptisms = [{
      baptism_id: 3,
      church_id: 9,
      quarter: 'Q1',
      first_name: 'Member',
      middle_name: null,
      last_name: 'Example',
      extension_name: null,
      birthdate: '1990-01-01',
      gender: 'other',
      address: 'Example address',
      officiating_minister: 'Pastor Example',
      place_of_baptism: 'Child Church',
      date_of_baptism: '2026-01-01',
      marital_status: 'single',
      is_reclaimed: false
    }];
    component.deaths = [{
      death_id: 4,
      baptism_id: 3,
      quarter: 'Q1',
      date_of_death: '2026-02-01',
      baptism: component.baptisms[0]
    }];

    expect(httpGet).toHaveBeenCalledWith('/api/baptisms', {
      params: { district_id: 8 }
    });
    expect(httpGet).toHaveBeenCalledWith('/api/deaths', {
      params: { district_id: 8 }
    });
    expect(component.displayedBaptisms.map(record => record.baptism_id))
      .toEqual([3]);
    expect(component.displayedDeaths.map(record => record.death_id))
      .toEqual([4]);
  });

  it('allows Head Assistants to open comments while viewing reports read-only', () => {
    currentUser.role = 'head assistant';
    component.isReadOnly = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Open comments"]')).not.toBeNull();
  });

  it('hides the personal-record access notice in the comments panel', () => {
    getDepartmentComments.mockReturnValue(throwError(() => ({
      error: {
        message: 'Baptism and death records must be accessed through the personal records page.'
      }
    })));
    component.churchId = 1;
    component.selectRecord('death');
    component.openComments();
    fixture.detectChanges();

    expect(component.commentsError).toBe('');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('continues to show unrelated comments errors', () => {
    getDepartmentComments.mockReturnValue(throwError(() => ({
      error: { message: 'Unable to reach the server.' }
    })));
    component.churchId = 1;
    component.selectRecord('death');
    component.openComments();
    fixture.detectChanges();

    expect(component.commentsError).toBe('Unable to reach the server.');
  });

  it('shows a shared Back button and returns assistant users to report monitoring', () => {
    component.isReadOnly = true;
    routerUrl = '/assistant/reports/records/16/1/1?return_to=monitoring';
    returnQueryParams = {
      return_to: 'monitoring',
      return_department: '16',
      return_expanded: '7',
      return_search: 'North',
      return_scroll: '240'
    };
    fixture.detectChanges();

    const backButton = fixture.nativeElement.querySelector(
      'header.relative.isolate button'
    ) as HTMLButtonElement;
    expect(backButton.textContent.trim()).toContain('Back to reports');
    expect(backButton.className).toContain('rounded-full');

    backButton.click();

    expect(navigate).toHaveBeenCalledWith(
      ['/assistant/reports'],
      {
        queryParams: {
          return_to: 'monitoring',
          return_department: '16',
          return_expanded: '7',
          return_search: 'North',
          return_scroll: '240'
        }
      }
    );
  });
});
