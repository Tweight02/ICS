import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth-service';
import { ChurchService } from '../../../core/services/church/church-service';
import { CURRENT_REPORT_YEAR } from '../../../core/utils/report-year';
import { DirectorReportSummary } from './report-summary';

describe('DirectorReportSummary', () => {
  let fixture: ComponentFixture<DirectorReportSummary>;
  let component: DirectorReportSummary;
  let currentUser: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: 'director' | 'assistant' | 'administrative assistant' | 'head assistant';
    department_id: number | null;
  };
  let routerUrl: string;
  let getMissionReportSummary: ReturnType<typeof vi.fn>;
  let getDepartments: ReturnType<typeof vi.fn>;
  let getBaptismRecordsForQuarter: ReturnType<typeof vi.fn>;
  let getDeathRecordsForQuarter: ReturnType<typeof vi.fn>;
  let navigation: { commands: string[]; extras?: Record<string, unknown> } | undefined;

  beforeEach(async () => {
    navigation = undefined;
    routerUrl = '/director/reports/summary';
    currentUser = {
      user_id: 7,
      first_name: 'Director',
      last_name: 'User',
      email: 'director@example.com',
      role: 'director',
      department_id: 17
    };
    getMissionReportSummary = vi.fn().mockReturnValue(of({
      success: true,
      data: {
        year: String(CURRENT_REPORT_YEAR),
        total_submitted_reports: 2,
        total_report_value: 35,
        quarter_totals: { q1: 10, q2: 25, q3: 0, q4: 0 },
        departments: [{
          department_id: 17,
          department_name: 'Youth Ministries',
          submitted_reports: 2,
          total_report_value: 35,
          quarter_totals: { q1: 10, q2: 25, q3: 0, q4: 0 },
          reports: [{
            program_id: 7,
            report_name: 'Attendance Report',
            submitted_reports: 2,
            total_report_value: 35,
            quarter_totals: { q1: 10, q2: 25, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 3,
              particular_name: 'Number of attendees',
              submitted_reports: 2,
              total_report_value: 35,
              quarter_totals: { q1: 10, q2: 25, q3: 0, q4: 0 }
            }]
          }, {
            program_id: 8,
            report_name: 'Camp Report',
            submitted_reports: 1,
            total_report_value: 18,
            quarter_totals: { q1: 18, q2: 0, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 4,
              particular_name: 'Camp attendees',
              submitted_reports: 1,
              total_report_value: 18,
              quarter_totals: { q1: 18, q2: 0, q3: 0, q4: 0 }
            }]
          }]
        }]
      }
    }));
    getDepartments = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { department_id: 17, department_name: 'Youth Ministries' },
        { department_id: 21, department_name: 'Communication' },
        { department_id: 22, department_name: 'Baptism Record' },
        { department_id: 23, department_name: 'Death Record' }
      ]
    }));
    getBaptismRecordsForQuarter = vi.fn().mockReturnValue(of({
      success: true,
      data: [{
        baptism_id: 27,
        church_id: 3,
        church_name: 'Sample Church',
        first_name: 'Sample',
        middle_name: 'B.',
        last_name: 'Member',
        extension_name: null,
        gender: 'Female',
        date_of_baptism: `${CURRENT_REPORT_YEAR}-04-15`,
        place_of_baptism: 'Sample Church',
        officiating_minister: 'Pastor Sample',
        is_reclaimed: false,
        birthdate: '1990-05-10',
        address: 'Sample Street',
        marital_status: 'single'
      }]
    }));
    getDeathRecordsForQuarter = vi.fn().mockReturnValue(of({
      success: true,
      data: [{
        death_id: 14,
        baptism_id: 27,
        church_id: 3,
        church_name: 'Sample Church',
        first_name: 'Sample',
        middle_name: 'B.',
        last_name: 'Member',
        extension_name: null,
        gender: 'Female',
        quarter: 'Q2',
        date_of_death: `${CURRENT_REPORT_YEAR}-04-15`,
        birthdate: '1990-05-10',
        address: 'Sample Street',
        marital_status: 'single',
        date_of_baptism: `${CURRENT_REPORT_YEAR - 5}-06-01`,
        place_of_baptism: 'Sample Church',
        officiating_minister: 'Pastor Sample',
        is_reclaimed: false
      }]
    }));

    await TestBed.configureTestingModule({
      imports: [DirectorReportSummary],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => null }
            }
          }
        },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => currentUser
          }
        },
        {
          provide: ChurchService,
          useValue: {
            getMissionReportSummary,
            getDepartments,
            getBaptismRecordsForQuarter,
            getDeathRecordsForQuarter
          }
        },
        {
          provide: Router,
          useValue: {
            get url() {
              return routerUrl;
            },
            navigate: (commands: string[], extras?: Record<string, unknown>) => {
              navigation = { commands, extras };
              return Promise.resolve(true);
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows Q1 through Q4 totals and each report total', () => {
    expect(getMissionReportSummary).toHaveBeenCalledWith(CURRENT_REPORT_YEAR);
    expect(getMissionReportSummary).toHaveBeenCalledWith(CURRENT_REPORT_YEAR, 17);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Q1');
    expect(text).toContain('Q2');
    expect(text).toContain('Q3');
    expect(text).toContain('Q4');
    expect(text).toContain('Attendance Report');
    expect(text).toContain('35');
    expect(text).toContain('Department total');
    expect(text).toContain('Youth Ministries report particulars');
    expect(text).toContain('Number of attendees');
    expect(text).not.toContain('Mission total');
    expect(fixture.nativeElement.querySelector('#summary-report-department')).toBeNull();
    expect(fixture.nativeElement.querySelector('#summary-report-program')).not.toBeNull();
  });

  it('exports summary rows for departments, reports, and particulars', () => {
    const exportButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Export / Print'));

    expect(exportButton).toBeDefined();
    expect(component.buildSummaryCsvRows()).toContainEqual([
      'Department',
      'Youth Ministries',
      '',
      '',
      2,
      10,
      25,
      0,
      0,
      35
    ]);
    expect(component.buildSummaryCsvRows()).toContainEqual([
      'Particular',
      'Youth Ministries',
      'Attendance Report',
      'Number of attendees',
      2,
      10,
      25,
      0,
      0,
      35
    ]);
  });

  it('previews the same summary rows used for CSV export', () => {
    component.openSummaryPreview();
    fixture.detectChanges();

    expect(component.summaryPreviewOpen()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Report summary preview');
    expect(fixture.nativeElement.textContent).toContain('Export Excel (.xlsx)');
    expect(fixture.nativeElement.querySelector('[data-summary-report-print-preview]')).not.toBeNull();
    expect(component.summaryPreviewRows()).toEqual(component.buildSummaryCsvRows());
  });

  it('reloads totals and updates the year query parameter', () => {
    const yearSelect = fixture.nativeElement.querySelector(
      '#summary-report-year'
    ) as HTMLSelectElement;
    yearSelect.value = String(CURRENT_REPORT_YEAR - 1);
    component.onYearChange({ target: yearSelect } as unknown as Event);

    expect(getMissionReportSummary).toHaveBeenCalledWith(CURRENT_REPORT_YEAR - 1);
    expect(getMissionReportSummary).toHaveBeenCalledWith(CURRENT_REPORT_YEAR - 1, 17);
    expect(navigation).toEqual({
      commands: [],
      extras: {
        relativeTo: expect.anything(),
        queryParams: { year: CURRENT_REPORT_YEAR - 1 },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }
    });
  });

  it('does not request summary data if a Director has no assigned department', () => {
    currentUser.department_id = null;
    getMissionReportSummary.mockClear();

    component.loadSummary();

    expect(getMissionReportSummary).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('A department must be assigned');
  });

  it('loads the selected baptism quarter records only after clicking its total', () => {
    currentUser.department_id = 22;
    getMissionReportSummary.mockReturnValue(of({
      success: true,
      data: {
        year: String(CURRENT_REPORT_YEAR),
        total_submitted_reports: 1,
        total_report_value: 2,
        quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 },
        departments: [{
          department_id: 22,
          department_name: 'Baptism Record',
          submitted_reports: 1,
          total_report_value: 2,
          quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 },
          reports: [{
            program_id: 89,
            report_name: 'Baptism Record',
            submitted_reports: 1,
            total_report_value: 2,
            quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 1,
              particular_name: 'Baptisms Reported',
              submitted_reports: 1,
              total_report_value: 2,
              quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 }
            }]
          }]
        }]
      }
    }));
    getBaptismRecordsForQuarter.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#baptism-records-results')).toBeNull();
    expect(getBaptismRecordsForQuarter).not.toHaveBeenCalled();

    const reportRow = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.querySelector('button') !== null);
    const quarterButton = reportRow?.querySelectorAll('button')[1] as HTMLButtonElement;
    quarterButton.click();
    fixture.detectChanges();

    expect(getBaptismRecordsForQuarter).toHaveBeenCalledWith(CURRENT_REPORT_YEAR, 'Q2');
    expect(fixture.nativeElement.querySelector('#baptism-records-results')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Q2 baptism records');
    expect(fixture.nativeElement.textContent).toContain('Sample B. Member');
    expect(fixture.nativeElement.textContent).toContain('Sample Church');
    expect(Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results thead th') as NodeListOf<HTMLElement>
    ).map(header => header.textContent?.trim())).toEqual([
      'Name',
      'Church',
      'Date of baptism',
      'Officiating minister',
      'Place of baptism',
      'Gender'
    ]);

    const baptismRow = fixture.nativeElement.querySelector(
      '#baptism-records-results tbody tr[tabindex="0"]'
    ) as HTMLTableRowElement;
    baptismRow.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Baptism record details');
    expect(fixture.nativeElement.textContent).toContain('Sample Street');
    expect(fixture.nativeElement.textContent).toContain('May 10, 1990');
  });

  it('lets assistants click the selected baptism department quarter totals', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    routerUrl = '/assistant/reports/summary';
    getMissionReportSummary.mockReturnValue(of({
      success: true,
      data: {
        year: String(CURRENT_REPORT_YEAR),
        total_submitted_reports: 1,
        total_report_value: 2,
        quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 },
        departments: [{
          department_id: 22,
          department_name: 'Baptism Record',
          submitted_reports: 1,
          total_report_value: 2,
          quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 },
          reports: [{
            program_id: 89,
            report_name: 'Baptism Record',
            submitted_reports: 1,
            total_report_value: 2,
            quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 1,
              particular_name: 'Baptisms Reported',
              submitted_reports: 1,
              total_report_value: 2,
              quarter_totals: { q1: 0, q2: 2, q3: 0, q4: 0 }
            }]
          }]
        }]
      }
    }));
    getBaptismRecordsForQuarter.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const departmentSelect = fixture.nativeElement.querySelector(
      '#summary-report-department'
    ) as HTMLSelectElement;
    departmentSelect.value = '22';
    component.onDepartmentChange({ target: departmentSelect } as unknown as Event);
    fixture.detectChanges();

    expect(component.isBaptismDepartmentSelected).toBe(true);
    expect(getBaptismRecordsForQuarter).not.toHaveBeenCalled();

    const reportRow = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Baptisms Reported'));
    const quarterButton = reportRow?.querySelectorAll('button')[1] as HTMLButtonElement;
    quarterButton.click();
    fixture.detectChanges();

    expect(getBaptismRecordsForQuarter).toHaveBeenCalledWith(CURRENT_REPORT_YEAR, 'Q2');
    expect(fixture.nativeElement.textContent).toContain('Q2 baptism records');
    expect(fixture.nativeElement.textContent).toContain('Sample B. Member');
  });

  it('lets assistants click the selected death department quarter totals', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    routerUrl = '/assistant/reports/summary';
    getMissionReportSummary.mockReturnValue(of({
      success: true,
      data: {
        year: String(CURRENT_REPORT_YEAR),
        total_submitted_reports: 1,
        total_report_value: 1,
        quarter_totals: { q1: 0, q2: 1, q3: 0, q4: 0 },
        departments: [{
          department_id: 23,
          department_name: 'Death Record',
          submitted_reports: 1,
          total_report_value: 1,
          quarter_totals: { q1: 0, q2: 1, q3: 0, q4: 0 },
          reports: [{
            program_id: 90,
            report_name: 'Death Record',
            submitted_reports: 1,
            total_report_value: 1,
            quarter_totals: { q1: 0, q2: 1, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 2,
              particular_name: 'Deaths Reported',
              submitted_reports: 1,
              total_report_value: 1,
              quarter_totals: { q1: 0, q2: 1, q3: 0, q4: 0 }
            }]
          }]
        }]
      }
    }));
    getDeathRecordsForQuarter.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const departmentSelect = fixture.nativeElement.querySelector(
      '#summary-report-department'
    ) as HTMLSelectElement;
    departmentSelect.value = '23';
    component.onDepartmentChange({ target: departmentSelect } as unknown as Event);
    fixture.detectChanges();

    expect(component.isDeathDepartmentSelected).toBe(true);
    expect(getDeathRecordsForQuarter).not.toHaveBeenCalled();

    const reportRow = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Deaths Reported'));
    const quarterButton = reportRow?.querySelectorAll('button')[1] as HTMLButtonElement;
    quarterButton.click();
    fixture.detectChanges();

    expect(getDeathRecordsForQuarter).toHaveBeenCalledWith(CURRENT_REPORT_YEAR, 'Q2');
    expect(fixture.nativeElement.textContent).toContain('Q2 death records');
    expect(fixture.nativeElement.textContent).toContain('Sample B. Member');
    expect(fixture.nativeElement.textContent).toContain('Sample Church');
    const deathRow = fixture.nativeElement.querySelector(
      '#baptism-records-results tbody tr[tabindex="0"]'
    ) as HTMLTableRowElement;
    deathRow.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Death record details');
    expect(fixture.nativeElement.textContent).toContain('Sample Street');
    expect(fixture.nativeElement.textContent).toContain('May 10, 1990');
    expect(fixture.nativeElement.querySelector('[aria-modal="true"]')).not.toBeNull();

    const closeButton = Array.from(
      fixture.nativeElement.querySelectorAll('[aria-modal="true"] button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.trim() === 'Close');
    closeButton?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-modal="true"]')).toBeNull();

    const particularsSection = Array.from(
      fixture.nativeElement.querySelectorAll('section') as NodeListOf<HTMLElement>
    ).find(section => section.textContent?.includes('Death Record report particulars'));
    const recordsSection = fixture.nativeElement.querySelector(
      '#baptism-records-results'
    ) as HTMLElement;
    expect(particularsSection?.compareDocumentPosition(recordsSection) &&
      (particularsSection.compareDocumentPosition(recordsSection) & Node.DOCUMENT_POSITION_FOLLOWING))
      .toBeTruthy();
  });

  it('lets Death Record directors click quarter totals but not other directors', () => {
    currentUser.department_id = 23;
    getMissionReportSummary.mockReturnValue(of({
      success: true,
      data: {
        year: String(CURRENT_REPORT_YEAR),
        total_submitted_reports: 1,
        total_report_value: 1,
        quarter_totals: { q1: 1, q2: 0, q3: 0, q4: 0 },
        departments: [{
          department_id: 23,
          department_name: 'Death Record',
          submitted_reports: 1,
          total_report_value: 1,
          quarter_totals: { q1: 1, q2: 0, q3: 0, q4: 0 },
          reports: [{
            program_id: 90,
            report_name: 'Death Record',
            submitted_reports: 1,
            total_report_value: 1,
            quarter_totals: { q1: 1, q2: 0, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 2,
              particular_name: 'Deaths Reported',
              submitted_reports: 1,
              total_report_value: 1,
              quarter_totals: { q1: 1, q2: 0, q3: 0, q4: 0 }
            }]
          }]
        }]
      }
    }));
    getDeathRecordsForQuarter.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isDeathDepartmentSelected).toBe(true);
    const quarterButton = fixture.nativeElement.querySelector(
      '#summary-report-department'
    );
    expect(quarterButton).toBeNull();
    const quarterTotal = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Deaths Reported'))?.querySelectorAll('button')[0] as HTMLButtonElement;
    quarterTotal.click();
    fixture.detectChanges();

    expect(getDeathRecordsForQuarter).toHaveBeenCalledWith(CURRENT_REPORT_YEAR, 'Q1');
    expect(fixture.nativeElement.textContent).toContain('Q1 death records');

    currentUser.department_id = 22;
    expect(component.isDeathDepartmentSelected).toBe(false);
    component.selectRecordQuarter('Q2');
    expect(getDeathRecordsForQuarter).toHaveBeenCalledTimes(1);
  });

  it('shows all-department totals to assistants and returns to assistant reports', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    routerUrl = '/assistant/reports/summary';
    getMissionReportSummary.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(getMissionReportSummary).toHaveBeenCalledOnce();
    expect(component.errorMessage()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Mission-wide report summary');
    expect(fixture.nativeElement.textContent).toContain('Quarterly totals across all departments');
    expect(fixture.nativeElement.textContent).not.toContain('Submitted reports');
    expect(fixture.nativeElement.textContent).not.toContain('Mission total');
    expect(fixture.nativeElement.querySelector('#summary-report-department')).not.toBeNull();

    component.backToReports();
    expect(navigation).toEqual({
      commands: ['/assistant/reports'],
      extras: { queryParams: { year: CURRENT_REPORT_YEAR } }
    });
  });

  it('loads the selected department particulars below the summary for assistants', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    routerUrl = '/assistant/reports/summary';
    getMissionReportSummary.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const departmentSelect = fixture.nativeElement.querySelector(
      '#summary-report-department'
    ) as HTMLSelectElement;
    departmentSelect.value = '17';
    component.onDepartmentChange({ target: departmentSelect } as unknown as Event);
    fixture.detectChanges();

    expect(getMissionReportSummary).toHaveBeenLastCalledWith(CURRENT_REPORT_YEAR, 17);
    expect(navigation).toEqual({
      commands: [],
      extras: {
        relativeTo: expect.anything(),
        queryParams: { department_id: 17 },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }
    });
    const detailsText = fixture.nativeElement.textContent as string;
    expect(detailsText).toContain('Youth Ministries report particulars');
    expect(detailsText).toContain('Number of attendees');
    expect(fixture.nativeElement.querySelector('#summary-report-program')).not.toBeNull();
    const particularRow = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Number of attendees'));
    expect(particularRow).toBeDefined();
    expect(particularRow?.querySelectorAll('td')).toHaveLength(5);
    expect(Array.from(particularRow?.querySelectorAll('td') ?? [])
      .some(cell => cell.textContent?.trim() !== '')).toBe(true);
  });

  it('lets assistants select one report when a department has multiple reports', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    routerUrl = '/assistant/reports/summary';
    getMissionReportSummary.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const departmentSelect = fixture.nativeElement.querySelector(
      '#summary-report-department'
    ) as HTMLSelectElement;
    departmentSelect.value = '17';
    component.onDepartmentChange({ target: departmentSelect } as unknown as Event);
    fixture.detectChanges();

    const reportSelect = fixture.nativeElement.querySelector(
      '#summary-report-program'
    ) as HTMLSelectElement;
    expect(reportSelect.options).toHaveLength(2);
    expect(reportSelect.value).toBe('7');
    expect(fixture.nativeElement.textContent).toContain('Number of attendees');
    expect(fixture.nativeElement.textContent).not.toContain('Camp attendees');

    reportSelect.value = '8';
    component.onReportChange({ target: reportSelect } as unknown as Event);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Camp attendees');
    expect(fixture.nativeElement.textContent).not.toContain('Number of attendees');
    expect(navigation).toEqual({
      commands: [],
      extras: {
        relativeTo: expect.anything(),
        queryParams: { report_id: 8 },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }
    });
  });
});
