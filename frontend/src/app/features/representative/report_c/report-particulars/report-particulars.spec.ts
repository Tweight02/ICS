import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportParticulars } from './report-particulars';

describe('ReportParticulars', () => {
  let component: ReportParticulars;
  let fixture: ComponentFixture<ReportParticulars>;
  let saveDepartmentReport: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const report = {
      department: { department_id: 3, department_name: 'Youth' },
      programs: [{
        program_id: 5,
        program_name: 'Program',
        sections: [{
          program_id: 6,
          program_name: 'Section',
          particulars: [
            {
              particular_id: 7,
              particular_name: 'Attendance',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: null,
                mission_approve: null
              }]
            },
            {
              particular_id: 8,
              particular_name: 'Outreach',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: null,
                mission_approve: null
              }]
            }
          ]
        }]
      }]
    };

    saveDepartmentReport = vi.fn().mockReturnValue(of({ message: 'Report submitted.' }));

    await TestBed.configureTestingModule({
      imports: [ReportParticulars],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ departmentId: '3' })),
            snapshot: { queryParamMap: convertToParamMap({}) }
          }
        },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ church_id: 2 }) } },
        {
          provide: ReportService,
          useValue: {
            getDepartmentReport: () => of(report),
            getDepartmentComments: () => of({ data: [] }),
            saveDepartmentReport
          }
        },
        { provide: Router, useValue: { navigate: vi.fn(), url: '/representative/reports/particulars/3' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportParticulars);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits blank inputs as zero', () => {
    component.saveReport();

    expect(saveDepartmentReport).toHaveBeenCalledOnce();
    expect(saveDepartmentReport.mock.calls[0][2]).toEqual([
      { particular_id: 7, quarter_id: 9, value: 0 },
      { particular_id: 8, quarter_id: 9, value: 0 }
    ]);
    expect(saveDepartmentReport.mock.calls[0][3]).toBe(true);
  });

  it('keeps approved quarter values visible in disabled inputs', async () => {
    const particulars = component.report!.programs[0].sections[0].particulars;
    for (const [index, particular] of particulars.entries()) {
      particular.quarters[0].value = index === 0 ? 15 : 0;
      particular.quarters[0].mission_approve = '2026-10-13';
    }

    fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

    expect(component.isQuarterApproved(9)).toBe(true);
    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];

    expect(inputs.map(input => input.value)).toEqual(['15', '0']);
    expect(inputs.every(input => input.disabled)).toBe(true);
  });
});
