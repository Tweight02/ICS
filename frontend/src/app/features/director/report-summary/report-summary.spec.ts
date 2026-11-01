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
    role: 'director';
    department_id: number | null;
  };
  let getMissionReportSummary: ReturnType<typeof vi.fn>;
  let getDepartments: ReturnType<typeof vi.fn>;
  let navigation: { commands: string[]; extras?: Record<string, unknown> } | undefined;

  beforeEach(async () => {
    navigation = undefined;
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
            quarter_totals: { q1: 10, q2: 25, q3: 0, q4: 0 }
          }]
        }]
      }
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
          useValue: { getMissionReportSummary }
        },
        {
          provide: Router,
          useValue: {
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
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Q1');
    expect(text).toContain('Q2');
    expect(text).toContain('Q3');
    expect(text).toContain('Q4');
    expect(text).toContain('Attendance Report');
    expect(text).toContain('35');
    expect(text).toContain('Department total');
    expect(text).not.toContain('Mission total');
    expect(fixture.nativeElement.querySelector('#summary-report-department')).toBeNull();
  });

  it('reloads totals and updates the year query parameter', () => {
    const yearSelect = fixture.nativeElement.querySelector(
      '#summary-report-year'
    ) as HTMLSelectElement;
    yearSelect.value = String(CURRENT_REPORT_YEAR - 1);
    component.onYearChange({ target: yearSelect } as unknown as Event);

    expect(getMissionReportSummary).toHaveBeenLastCalledWith(CURRENT_REPORT_YEAR - 1);
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

    component.loadSummary();

    expect(getMissionReportSummary).toHaveBeenCalledOnce();
    expect(component.errorMessage()).toContain('A department must be assigned');
  });
});
