import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { CURRENT_REPORT_YEAR } from '../../../../core/utils/report-year';
import { ReportPrograms } from '../../../pastor/report_p/report-programs/report-programs';

describe('ReportPrograms', () => {
  let component: ReportPrograms;
  let fixture: ComponentFixture<ReportPrograms>;
  let getDepartments: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let routeQueryParams = convertToParamMap({});

  beforeEach(async () => {
    navigate = vi.fn();
    routeQueryParams = convertToParamMap({});
    const getCurrentUser = vi.fn().mockReturnValue({
      user_id: 7,
      first_name: 'Casey',
      last_name: 'Representative',
      email: 'casey@example.com',
      role: 'representative',
      church_id: 1
    });

    getDepartments = vi.fn().mockReturnValue(of([
      {
        department_id: 4,
        department_name: 'Youth',
        q1_approved: false,
        q1_data_progress: 50,
        q2_approved: true,
        q2_data_progress: 100,
        q3_approved: true,
        q3_data_progress: 0
      },
      { department_id: 18, department_name: 'Womens Ministries' },
      { department_id: 16, department_name: 'Ministerial & Evangelism' },
      { department_id: 20, department_name: 'Adventist Mission' },
      { department_id: 22, department_name: 'Baptism Record' },
      { department_id: 23, department_name: 'Death Record' },
      { department_id: 30, department_name: 'Other Department' }
    ]));
    const getAllChurches = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { church_id: 1, name: 'Batanes', address: null, parent_id: null },
        { church_id: 2, name: 'Pasuc', address: null, parent_id: 1 }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [ReportPrograms],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: {
              get queryParamMap() {
                return routeQueryParams;
              }
            }
          }
        },
        { provide: AuthService, useValue: { getCurrentUser } },
        { provide: ChurchService, useValue: { getAllChurches } },
        { provide: ReportService, useValue: { getDepartments } },
        { provide: Router, useValue: { url: '/representative/reports/programs', navigate } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportPrograms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resolves a district assignment to its sole local church', () => {
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(getDepartments).toHaveBeenCalledWith(2, CURRENT_REPORT_YEAR);
    expect(component.churchName).toBe('Pasuc');
    expect(component.districtName).toBe('Batanes');
  });

  it('shows quarter review states without progress percentages in the table', () => {
    const monitoring = component.getMonitoring(0);

    expect(monitoring.q1).toEqual({
      progress: 50,
      approved: false,
      endorsed: false,
      submitted: false
    });
    expect(monitoring.q2).toEqual({
      progress: 100,
      approved: true,
      endorsed: false,
      submitted: false
    });

    const quarterCells = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr')[0].querySelectorAll('td')
    ) as HTMLTableCellElement[];
    expect(quarterCells[0].textContent).toContain('In progress');
    expect(quarterCells[0].textContent).not.toContain('%');
    expect(quarterCells[1].textContent.trim()).toBe('✓');
    expect(quarterCells[1].querySelector('[aria-label="Approved"]')).not.toBeNull();
    expect(quarterCells[2].textContent.trim()).toBe('✓');
    expect(quarterCells[3].textContent.trim()).toBe('-');
  });

  it('shows submitted progress and an explicit review status in the table', () => {
    const youth = component.departments.find(department => department.department_name === 'Youth');
    expect(youth).toBeDefined();
    youth!.q1_submitted = true;

    expect(component.getQuarterStatus(component.getMonitoring(0).q1))
      .toEqual({ label: 'Submitted', tone: 'submitted' });
    expect(component.getMonitoring(0).q1).toEqual({
      progress: 50,
      approved: false,
      endorsed: false,
      submitted: true
    });
  });

  it('uses the assistant quarter status labels for endorsed, ready, and not-started reports', () => {
    const youth = component.departments.find(department => department.department_name === 'Youth');
    expect(youth).toBeDefined();
    youth!.q1_endorsed = true;
    youth!.q4_data_progress = 0;
    youth!.q3_data_progress = 100;
    youth!.q3_approved = false;
    youth!.q3_endorsed = false;
    youth!.q3_submitted = false;

    expect(component.getQuarterStatus(component.getMonitoring(0).q1))
      .toEqual({ label: 'Endorsed', tone: 'endorsed' });
    expect(component.getQuarterStatus(component.getMonitoring(0).q4))
      .toEqual({ label: '-', tone: 'not-started' });
    expect(component.getQuarterStatus(component.getMonitoring(0).q3))
      .toEqual({ label: 'In progress', tone: 'in-progress' });
  });

  it('shows all departments except pastor personal report departments', () => {
    expect(component.representativeDepartments.map(department => department.department_id)).toEqual([4, 18, 30]);
  });

  it('displays the corrected womens ministries label', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
    const departmentRow = Array.from(
      rows
    ).find(row => row.textContent?.includes("Women's Ministries"));

    expect(departmentRow?.textContent).toContain("Women's Ministries");
    expect(departmentRow?.textContent).not.toContain('Womens Ministries');
  });

  it('opens the selected department report quarter with return context', () => {
    const q2Button = fixture.nativeElement.querySelector(
      'tbody tr:first-child td:nth-child(3) button'
    ) as HTMLButtonElement;

    expect(q2Button.getAttribute('aria-label')).toBe('Open Q2 report for Youth');
    q2Button.click();

    expect(navigate).toHaveBeenCalledWith(
      ['/representative/reports/particulars', 4],
      {
        queryParams: {
          year: String(CURRENT_REPORT_YEAR),
          quarter: 'Q2',
          return_to: 'programs',
          return_department: '4',
          return_scroll: String(window.scrollY),
          return_quarter: 'q2'
        }
      }
    );
  });

  it('marks the previously opened department and quarter on return', () => {
    const youth = component.departments.find(department => department.department_id === 4)!;
    component.returnedDepartmentId.set(4);
    component.returnedQuarter.set('q2');

    expect(component.isReturnedDepartment(youth)).toBe(true);
    expect(component.isReturnedQuarter(youth, 'Q2')).toBe(true);
    expect(component.isReturnedQuarter(youth, 'q1')).toBe(false);
  });

  it('cleans return parameters from the URL after restoring the selected report', async () => {
    routeQueryParams = convertToParamMap({
      year: '2026',
      return_to: 'programs',
      return_department: '19',
      return_quarter: 'q3',
      return_scroll: '120'
    });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    component.returnedDepartmentId.set(19);
    component.returnedQuarter.set('q3');
    component['restoreRepresentativeSelection']();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(scrollTo).toHaveBeenCalledWith(0, 120);
    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        return_to: null,
        return_department: null,
        return_quarter: null,
        return_scroll: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    scrollTo.mockRestore();
  });

  it('shows report status in the table without a separate notification banner', () => {
    const quarterCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(2)') as HTMLTableCellElement;
    expect(quarterCell.textContent).toContain('In progress');
    expect(quarterCell.textContent).not.toContain('%');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('maps submitted state into the quarter monitoring data', () => {
    const youth = component.departments.find(department => department.department_name === 'Youth');
    expect(youth).toBeDefined();
    youth!.q1_submitted = true;
    expect(component.getMonitoring(0).q1).toEqual({
      progress: 50,
      approved: false,
      endorsed: false,
      submitted: true
    });
  });
});
