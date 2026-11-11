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
    role: 'director' | 'assistant' | 'administrative assistant' | 'head assistant' | 'pastor';
    department_id: number | null;
  };
  let routerUrl: string;
  let getMissionReportSummary: ReturnType<typeof vi.fn>;
  let getReportSummaryDrilldown: ReturnType<typeof vi.fn>;
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
    getReportSummaryDrilldown = vi.fn();
    getDepartments = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { department_id: 16, department_name: 'Ministerial & Evangelism' },
        { department_id: 17, department_name: 'Youth Ministries' },
        { department_id: 21, department_name: 'Communication' },
        { department_id: 20, department_name: 'Adventist Mission' },
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
        district_id: 2,
        district_name: 'Sample District',
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
        district_id: 2,
        district_name: 'Sample District',
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
            getReportSummaryDrilldown,
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

  it('shows department particulars without the mission-wide quarterly totals card', () => {
    expect(getMissionReportSummary).toHaveBeenCalledWith(CURRENT_REPORT_YEAR);
    expect(getMissionReportSummary).toHaveBeenCalledWith(CURRENT_REPORT_YEAR, 17);
    const subtitle = fixture.nativeElement.querySelector(
      '#summary-report-subtitle'
    ) as HTMLParagraphElement;
    expect(subtitle.textContent).toContain('Quarterly totals for your assigned department');
    expect(subtitle.nextElementSibling?.querySelector('#summary-report-year')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#summary-report-department')).toBeNull();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Q1');
    expect(text).toContain('Q2');
    expect(text).toContain('Q3');
    expect(text).toContain('Q4');
    expect(text).toContain('Attendance Report');
    expect(text).toContain('35');
    expect(text).not.toContain('Report totals by quarter');
    expect(text).not.toContain('Department / report');
    expect(text).not.toContain('Submitted reports');
    expect(text).not.toContain('Department total');
    expect(text).toContain('Youth Ministries report particulars');
    expect(text).toContain('Number of attendees');
    const reportTotalRow = fixture.nativeElement.querySelector(
      '#summary-report-total'
    ) as HTMLTableRowElement;
    expect(reportTotalRow.textContent).toContain('Total — Attendance Report');
    expect(reportTotalRow.textContent).toContain('10');
    expect(reportTotalRow.textContent).toContain('25');
    expect(reportTotalRow.textContent).toContain('35');
    const particularsTable = Array.from(
      fixture.nativeElement.querySelectorAll('table') as NodeListOf<HTMLTableElement>
    ).find(table => table.querySelector('thead th')?.textContent?.trim().toLowerCase() ===
      'report / particular') as HTMLTableElement;
    expect(Array.from(particularsTable.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .slice(1)
      .every(header => header.className.includes('text-center'))).toBe(true);
    const particularRow = particularsTable.querySelector('tbody tr') as HTMLTableRowElement;
    expect(Array.from(particularRow.querySelectorAll('td') as NodeListOf<HTMLElement>)
      .every(cell => cell.className.includes('text-center'))).toBe(true);
    expect(Array.from(reportTotalRow.querySelectorAll('td') as NodeListOf<HTMLElement>)
      .every(cell => cell.className.includes('text-center'))).toBe(true);
    expect(fixture.nativeElement.querySelector(
      '[aria-label="View total district breakdown for Number of attendees"]'
    )).not.toBeNull();
    expect(text).not.toContain('Mission total');
    expect(fixture.nativeElement.querySelector('#summary-report-department')).toBeNull();
    expect(fixture.nativeElement.querySelector('#summary-report-program')).not.toBeNull();
  });

  it('lets District Pastors select a department and shows only their district church list', () => {
    fixture.destroy();
    routerUrl = '/pastor/reports/summary';
    currentUser = {
      user_id: 7,
      first_name: 'District',
      last_name: 'Pastor',
      email: 'pastor@example.com',
      role: 'pastor',
      department_id: null
    };
    getReportSummaryDrilldown.mockReturnValueOnce(of({
      success: true,
      data: {
        level: 'churches',
        year: String(CURRENT_REPORT_YEAR),
        quarter: 'Q1',
        department_name: 'Youth Ministries',
        report_name: 'Attendance Report',
        particular_name: 'Number of attendees',
        district_id: 2,
        district_name: 'North District',
        entries: [{
          church_id: 5,
          church_name: 'North Church',
          value: 10,
          submitted_reports: 1
        }]
      }
    }));

    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isDistrictPastorPortal).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('District report summary');
    expect(fixture.nativeElement.querySelector('#summary-report-department')).not.toBeNull();
    const departmentSelect = fixture.nativeElement.querySelector(
      '#summary-report-department'
    ) as HTMLSelectElement;
    expect(component.selectableDepartments().map(department => department.department_id))
      .toEqual([17, 21]);
    departmentSelect.value = '17';
    departmentSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const quarterButton = fixture.nativeElement.querySelector(
      '[aria-label="View Q1 district breakdown for Number of attendees"]'
    ) as HTMLButtonElement;
    quarterButton.click();
    fixture.detectChanges();

    expect(getReportSummaryDrilldown).toHaveBeenCalledWith({
      year: CURRENT_REPORT_YEAR,
      department_id: 17,
      program_id: 7,
      particular_id: 3,
      quarter: 'Q1'
    });
    expect(fixture.nativeElement.textContent).toContain('North Church');
    const drilldownHeading = fixture.nativeElement.querySelector(
      '#report-summary-drilldown h2'
    ) as HTMLHeadingElement;
    expect(drilldownHeading.textContent).not.toContain(String(CURRENT_REPORT_YEAR));
    expect(drilldownHeading.querySelector('span')?.className).toContain('text-sm');
    expect(fixture.nativeElement.querySelector(
      '#report-summary-drilldown button'
    )?.textContent).not.toContain('Back to districts');
    expect(fixture.nativeElement.querySelector(
      '#report-summary-drilldown tbody tr'
    )?.className).not.toContain('cursor-pointer');
  });

  it('drills from a report quarter to districts and stops at the church list', () => {
    getReportSummaryDrilldown
      .mockReturnValueOnce(of({
        success: true,
        data: {
          level: 'districts',
          year: String(CURRENT_REPORT_YEAR),
          quarter: 'Q1',
          department_name: 'Youth Ministries',
          report_name: 'Attendance Report',
          particular_name: 'Number of attendees',
          entries: [{
            church_id: 3,
            church_name: 'North District',
            value: 10,
            submitted_reports: 1
          }]
        }
      }))
      .mockReturnValueOnce(of({
        success: true,
        data: {
          level: 'churches',
          year: String(CURRENT_REPORT_YEAR),
          quarter: 'Q1',
          department_name: 'Youth Ministries',
          report_name: 'Attendance Report',
          particular_name: 'Number of attendees',
          district_id: 3,
          district_name: 'North District',
          entries: [{
            church_id: 4,
            church_name: 'Sample Church',
            value: 10,
            submitted_reports: 1
          }]
        }
      }))
    const reportQuarterButton = fixture.nativeElement.querySelector(
      '[aria-label="View Q1 district breakdown for Number of attendees"]'
    ) as HTMLButtonElement;
    reportQuarterButton.click();
    fixture.detectChanges();

    expect(getReportSummaryDrilldown).toHaveBeenNthCalledWith(1, {
      year: CURRENT_REPORT_YEAR,
      department_id: 17,
      program_id: 7,
      particular_id: 3,
      quarter: 'Q1'
    });

    expect(fixture.nativeElement.textContent).toContain('North District');
    const drilldownTable = fixture.nativeElement.querySelector(
      '#report-summary-drilldown table'
    ) as HTMLTableElement;
    expect(drilldownTable.className).toContain('table-fixed');
    const districtRow = fixture.nativeElement.querySelector(
      '[aria-label="View churches in North District"]'
    ) as HTMLTableRowElement;
    expect(districtRow.className).toContain('cursor-pointer');
    districtRow.click();
    fixture.detectChanges();
    expect(getReportSummaryDrilldown).toHaveBeenNthCalledWith(2, {
      year: CURRENT_REPORT_YEAR,
      department_id: 17,
      program_id: 7,
      particular_id: 3,
      quarter: 'Q1',
      district_id: 3
    });
    expect(fixture.nativeElement.textContent).toContain('Sample Church');

    const churchRow = fixture.nativeElement.querySelector(
      '#report-summary-drilldown-table tbody tr'
    ) as HTMLTableRowElement;
    expect(churchRow.className).not.toContain('cursor-pointer');
    churchRow.click();
    fixture.detectChanges();
    expect(getReportSummaryDrilldown).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('District: North District');
    expect(fixture.nativeElement.textContent).not.toContain('Report particular');
  });

  it('keeps the district label visible in church details when the district name is missing', () => {
    component.reportDrilldown.set({
      level: 'particulars',
      year: String(CURRENT_REPORT_YEAR),
      quarter: 'Q1',
      department_name: 'Youth Ministries',
      report_name: 'Attendance Report',
      particular_name: 'Number of attendees',
      church_id: 4,
      church_name: 'Sample Church',
      particulars: []
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('District: Unavailable');
    expect(fixture.nativeElement.textContent).toContain('Church: Sample Church');
  });

  it('opens the same drilldown from a particular annual total', () => {
    getReportSummaryDrilldown.mockReturnValueOnce(of({
      success: true,
      data: {
        level: 'districts',
        year: String(CURRENT_REPORT_YEAR),
        quarter: 'TOTAL',
        department_name: 'Youth Ministries',
        report_name: 'Attendance Report',
        particular_name: 'Number of attendees',
        entries: []
      }
    }));

    const totalButton = fixture.nativeElement.querySelector(
      '[aria-label="View total district breakdown for Number of attendees"]'
    ) as HTMLButtonElement;
    totalButton.click();
    fixture.detectChanges();

    expect(getReportSummaryDrilldown).toHaveBeenCalledWith({
      year: CURRENT_REPORT_YEAR,
      department_id: 17,
      program_id: 7,
      particular_id: 3,
      quarter: 'TOTAL'
    });
    expect(fixture.nativeElement.textContent).toContain('Annual total');
  });

  it('shows totals for districts, multiple churches, and report particulars', () => {
    component.reportDrilldown.set({
      level: 'districts',
      year: String(CURRENT_REPORT_YEAR),
      quarter: 'Q1',
      department_name: 'Youth Ministries',
      report_name: 'Attendance Report',
      particular_name: 'All report particulars',
      entries: [
        { church_id: 3, church_name: 'North District', value: 10, submitted_reports: 1 },
        { church_id: 5, church_name: 'South District', value: 15, submitted_reports: 1 }
      ]
    });
    fixture.detectChanges();

    let totalRow = Array.from(
      fixture.nativeElement.querySelectorAll('#report-summary-drilldown tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Total'));
    expect(totalRow?.textContent).toContain('25');

    component.reportDrilldown.set({
      level: 'churches',
      year: String(CURRENT_REPORT_YEAR),
      quarter: 'Q1',
      department_name: 'Youth Ministries',
      report_name: 'Attendance Report',
      particular_name: 'All report particulars',
      district_id: 3,
      district_name: 'North District',
      entries: [
        { church_id: 4, church_name: 'North Church A', value: 10, submitted_reports: 1 },
        { church_id: 6, church_name: 'North Church B', value: 15, submitted_reports: 1 }
      ]
    });
    fixture.detectChanges();

    totalRow = Array.from(
      fixture.nativeElement.querySelectorAll('#report-summary-drilldown tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Total'));
    expect(totalRow?.textContent).toContain('25');

    component.reportDrilldown.set({
      level: 'churches',
      year: String(CURRENT_REPORT_YEAR),
      quarter: 'Q1',
      department_name: 'Youth Ministries',
      report_name: 'Attendance Report',
      particular_name: 'All report particulars',
      district_id: 3,
      district_name: 'North District',
      entries: [
        { church_id: 4, church_name: 'North Church A', value: 10, submitted_reports: 1 }
      ]
    });
    fixture.detectChanges();
    expect(Array.from(
      fixture.nativeElement.querySelectorAll('#report-summary-drilldown tbody tr') as NodeListOf<HTMLTableRowElement>
    ).some(row => row.textContent?.includes('Total'))).toBe(false);

    component.reportDrilldown.set({
      level: 'particulars',
      year: String(CURRENT_REPORT_YEAR),
      quarter: 'Q1',
      department_name: 'Youth Ministries',
      report_name: 'Attendance Report',
      particular_name: 'All report particulars',
      district_id: 3,
      district_name: 'North District',
      church_id: 4,
      church_name: 'North Church A',
      particulars: [
        { particular_id: 3, particular_name: 'Number of attendees', value: 10 },
        { particular_id: 4, particular_name: 'Camp attendees', value: 15 }
      ]
    });
    fixture.detectChanges();

    totalRow = Array.from(
      fixture.nativeElement.querySelectorAll('#report-summary-drilldown tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Total — Attendance Report'));
    expect(totalRow?.textContent).toContain('25');
  });

  it('drills down from the selected report quarterly total without changing particular links', () => {
    getReportSummaryDrilldown.mockReturnValueOnce(of({
      success: true,
      data: {
        level: 'districts',
        year: String(CURRENT_REPORT_YEAR),
        quarter: 'Q2',
        department_name: 'Youth Ministries',
        report_name: 'Attendance Report',
        particular_name: 'All report particulars',
        entries: []
      }
    }));

    const totalButton = fixture.nativeElement.querySelector(
      '[aria-label="View Q2 total district breakdown for Attendance Report"]'
    ) as HTMLButtonElement;
    totalButton.click();
    fixture.detectChanges();

    expect(getReportSummaryDrilldown).toHaveBeenCalledWith({
      year: CURRENT_REPORT_YEAR,
      department_id: 17,
      program_id: 7,
      quarter: 'Q2'
    });
    expect(fixture.nativeElement.textContent).toContain('Q2');
    expect(fixture.nativeElement.querySelector(
      '[aria-label="View Q2 district breakdown for Number of attendees"]'
    )).not.toBeNull();
  });

  it('exports only the selected director report and its particulars', () => {
    const exportButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Export / Print'));

    expect(exportButton).toBeDefined();
    const reportSelect = fixture.nativeElement.querySelector(
      '#summary-report-program'
    ) as HTMLSelectElement;
    reportSelect.value = '8';
    component.onReportChange({ target: reportSelect } as unknown as Event);

    const rows = component.buildSummaryCsvRows();
    expect(rows).toEqual([
      ['Report', 'Camp Report'],
      ['Year', CURRENT_REPORT_YEAR],
      [],
      ['Report / Particular', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
      ['Camp attendees', 18, 0, 0, 0, 18]
    ]);
    expect(rows.some(row => row.includes('Attendance Report'))).toBe(false);
    expect(rows.some(row => row.includes('Report summary'))).toBe(false);
  });

  it('previews the same summary rows used for CSV export', () => {
    const preview = document.body.querySelector(
      '[aria-labelledby="summary-preview-title"]'
    ) as HTMLElement;
    expect(preview).not.toBeNull();
    expect(preview.parentElement).toBe(document.body);
    expect(preview.style.display).toBe('none');
    expect(preview.getAttribute('aria-hidden')).toBe('true');

    component.openSummaryPreview();
    fixture.detectChanges();

    expect(component.summaryPreviewOpen()).toBe(true);
    expect(preview.style.display).toBe('flex');
    expect(preview.getAttribute('aria-hidden')).toBe('false');
    expect(preview.textContent).toContain('Attendance Report preview');
    expect(preview.textContent).toContain('Export Excel (.xlsx)');
    expect(preview.querySelector('[data-summary-report-print-preview]')).not.toBeNull();
    expect(component.summaryPreviewRows()).toEqual(component.buildSummaryCsvRows());
    expect(preview.textContent).not.toContain('Type');
    expect(preview.textContent).not.toContain('Department');
    expect(preview.querySelector('.report-export-button-close')).toBeNull();

    const closeButton = preview.querySelector('[aria-label="Close preview"]') as HTMLButtonElement;
    expect(closeButton).not.toBeNull();
    closeButton.click();
    fixture.detectChanges();
    expect(component.summaryPreviewOpen()).toBe(false);
    expect(preview.style.display).toBe('none');
    expect(preview.getAttribute('aria-hidden')).toBe('true');
  });

  it('limits preview and export rows to the selected assistant department', () => {
    currentUser.role = 'assistant';
    currentUser.department_id = null;
    routerUrl = '/assistant/reports/summary';
    getMissionReportSummary.mockClear();
    fixture.destroy();
    fixture = TestBed.createComponent(DirectorReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const reportSummary = component.summary();
    expect(reportSummary).not.toBeNull();
    component.summary.set({
      ...reportSummary!,
      departments: [
        ...reportSummary!.departments,
        {
          department_id: 21,
          department_name: 'Communication',
          submitted_reports: 1,
          total_report_value: 42,
          quarter_totals: { q1: 42, q2: 0, q3: 0, q4: 0 },
          reports: [{
            program_id: 9,
            report_name: 'Communication Report',
            submitted_reports: 1,
            total_report_value: 42,
            quarter_totals: { q1: 42, q2: 0, q3: 0, q4: 0 },
            particulars: [{
              particular_id: 5,
              particular_name: 'Communication activities',
              submitted_reports: 1,
              total_report_value: 42,
              quarter_totals: { q1: 42, q2: 0, q3: 0, q4: 0 }
            }]
          }]
        }
      ]
    });

    expect(component.buildSummaryCsvRows()).toEqual([]);
    expect(Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).some(button => button.textContent?.includes('Export / Print'))).toBe(false);

    const departmentSelect = fixture.nativeElement.querySelector(
      '#summary-report-department'
    ) as HTMLSelectElement;
    departmentSelect.value = '17';
    component.onDepartmentChange({ target: departmentSelect } as unknown as Event);

    const rows = component.buildSummaryCsvRows();
    expect(rows).toEqual([
      ['Report', 'Attendance Report'],
      ['Year', CURRENT_REPORT_YEAR],
      [],
      ['Report / Particular', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
      ['Number of attendees', 10, 25, 0, 0, 35]
    ]);
    expect(rows.some(row => row.includes('Communication'))).toBe(false);
    expect(rows.some(row => row.includes('Camp attendees'))).toBe(false);

    component.openSummaryPreview();
    fixture.detectChanges();
    expect(component.summaryPreviewRows()).toEqual(rows);
    expect(document.body.querySelector('[aria-labelledby="summary-preview-title"]')?.textContent)
      .toContain('Attendance Report preview');
    expect(document.body.querySelector('[data-summary-report-print-preview]')?.textContent)
      .not.toContain('Communication');
    expect(document.body.querySelector('[data-summary-report-print-preview]')?.textContent)
      .toContain('Number of attendees');
    expect(document.body.querySelector('[data-summary-report-print-preview]')?.textContent)
      .not.toContain('Camp attendees');
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
    expect(fixture.nativeElement.textContent).toContain(
      `Baptism Record · ${CURRENT_REPORT_YEAR} · District: All districts`
    );
    expect(fixture.nativeElement.textContent).toContain('Sample District');
    let recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    expect(Array.from(recordsTable.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .map(header => header.textContent?.trim())).toEqual(['District', 'Records']);
    const baptismTotalRow = Array.from(
      recordsTable.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Total'));
    baptismTotalRow?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Records across all districts');
    recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    expect(Array.from(recordsTable.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .map(header => header.textContent?.trim())).toEqual([
        'Name',
        'District',
        'Church',
        'Date of baptism',
        'Officiating minister',
        'Place of baptism',
        'Gender'
      ]);
    Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.trim() === 'Back to districts')?.click();
    fixture.detectChanges();
    recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    expect(Array.from(recordsTable.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .map(header => header.textContent?.trim())).toEqual(['District', 'Records']);
    recordsTable.querySelector('tbody button')?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Records in Sample District');
    recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    expect(fixture.nativeElement.textContent).toContain('District: Sample District');
    expect(fixture.nativeElement.textContent).toContain('Sample B. Member');
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
    expect(
      (fixture.nativeElement.querySelector('#baptism-records-results table') as HTMLTableElement)
        .className
    ).toContain('table-fixed');
    const baptismHeaders = Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results thead th') as NodeListOf<HTMLElement>
    );
    expect(baptismHeaders[1].className).toContain('md:table-cell');
    expect(baptismHeaders[3].className).toContain('lg:table-cell');
    expect(baptismHeaders[4].className).toContain('xl:table-cell');

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
    expect(fixture.nativeElement.textContent).toContain(
      `Baptism Record · ${CURRENT_REPORT_YEAR} · District: All districts`
    );
    const recordsSection = fixture.nativeElement.querySelector('#baptism-records-results') as HTMLElement;
    recordsSection.querySelector('tbody button')?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sample B. Member');
    const baptismReportRow = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Baptisms Reported'));
    const annualTotalButton = baptismReportRow?.lastElementChild?.querySelector('button') as HTMLButtonElement;
    annualTotalButton.click();
    fixture.detectChanges();

    expect(getBaptismRecordsForQuarter).toHaveBeenLastCalledWith(CURRENT_REPORT_YEAR, 'TOTAL');
    expect(fixture.nativeElement.textContent).toContain('TOTAL');
    expect(Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results thead th') as NodeListOf<HTMLElement>
    ).map(header => header.textContent?.trim())).toEqual(['District', 'Records']);
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
    expect(fixture.nativeElement.textContent).toContain(
      `Death Record · ${CURRENT_REPORT_YEAR} · District: All districts`
    );
    expect(fixture.nativeElement.textContent).toContain('Sample District');
    let recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    expect(Array.from(recordsTable.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .map(header => header.textContent?.trim())).toEqual(['District', 'Records']);
    const deathTotalRow = Array.from(
      recordsTable.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>
    ).find(row => row.textContent?.includes('Total'));
    deathTotalRow?.querySelector('button')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Records across all districts');
    recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    expect(Array.from(recordsTable.querySelectorAll('thead th') as NodeListOf<HTMLElement>)
      .map(header => header.textContent?.trim())).toEqual([
        'Name',
        'District',
        'Church',
        'Date of death',
        'Gender',
        'Quarter'
      ]);
    Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.trim() === 'Back to districts')?.click();
    fixture.detectChanges();
    recordsTable = fixture.nativeElement.querySelector(
      '#baptism-records-results table'
    ) as HTMLTableElement;
    recordsTable.querySelector('tbody button')?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Records in Sample District');
    expect(fixture.nativeElement.textContent).toContain('District: Sample District');
    expect(fixture.nativeElement.textContent).toContain('Sample B. Member');
    expect(Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results thead th') as NodeListOf<HTMLElement>
    ).map(header => header.textContent?.trim())).toEqual([
      'Name',
      'Church',
      'Date of death',
      'Gender',
      'Quarter'
    ]);
    const deathHeaders = Array.from(
      fixture.nativeElement.querySelectorAll('#baptism-records-results thead th') as NodeListOf<HTMLElement>
    );
    expect(deathHeaders[1].className).toContain('md:table-cell');
    expect(deathHeaders[3].className).toContain('sm:table-cell');
    expect(deathHeaders[4].className).toContain('md:table-cell');
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
    expect(fixture.nativeElement.textContent).toContain(
      `Death Record · ${CURRENT_REPORT_YEAR} · District: All districts`
    );

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
    const yearSelect = fixture.nativeElement.querySelector('#summary-report-year') as HTMLSelectElement;
    const departmentSelect = fixture.nativeElement.querySelector('#summary-report-department') as HTMLSelectElement;
    expect(departmentSelect).not.toBeNull();
    expect(yearSelect.parentElement?.parentElement).toBe(departmentSelect.parentElement?.parentElement);

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
    const selectedReportTotalRow = fixture.nativeElement.querySelector(
      '#summary-report-total'
    ) as HTMLTableRowElement;
    expect(selectedReportTotalRow.textContent).toContain('Total — Camp Report');
    expect(selectedReportTotalRow.textContent).toContain('18');
    expect(selectedReportTotalRow.textContent).not.toContain('35');
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
