import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportParticulars } from './report-particulars';

describe('ReportParticulars', () => {
  let component: ReportParticulars;
  let fixture: ComponentFixture<ReportParticulars>;
  let saveDepartmentReport: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true
    });

    const paramMap = convertToParamMap({
      departmentId: '16',
      churchId: '2',
      districtId: '1'
    });
    const queryParamMap = convertToParamMap({
      church_name: 'Test Church',
      district_name: 'Test District'
    });
    const report = {
      department: { department_id: 16, department_name: 'Ministerial & Evangelism' },
      programs: [{
        program_id: 1,
        program_name: 'Quarterly Report',
        sections: [
          {
            program_id: 2,
            program_name: 'First Section',
            particulars: [{
              particular_id: 3,
              particular_name: 'Members visited',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: 10,
                date_submitted: null,
                district_endorse: null,
                mission_approve: null
              }]
            }]
          },
          { program_id: 4, program_name: 'Second Section', particulars: [] }
        ]
      }]
    };
    saveDepartmentReport = vi.fn().mockReturnValue(of({ message: 'Report saved successfully.' }));
    navigate = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ReportParticulars],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(paramMap),
            snapshot: { paramMap, queryParamMap }
          }
        },
        { provide: Router, useValue: { navigate, url: '/pastor/reports/particulars/16/1/2' } },
        { provide: AuthService, useValue: { getCurrentUser: () => null } },
        { provide: ChurchService, useValue: {} },
        {
          provide: ReportService,
          useValue: {
            getDepartmentComments: () => of({ data: [] }),
            getDepartmentReport: () => of(report),
            saveDepartmentReport
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportParticulars);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows stewardship sections and computes the offering and tithe totals', () => {
    component.departmentId = 14;
    component.report!.department!.department_id = 14;
    component.report!.programs[0].sections = [
      {
        program_id: 21,
        program_name: 'STEWARDSHIP',
        particulars: [{
          particular_id: 22,
          particular_name: 'No. of Church Members',
          quarters: [{
            quarter_id: 9,
            quarter: 'Q1',
            year: 2026,
            value: 40,
            date_submitted: null,
            district_endorse: null,
            mission_approve: null
          }]
        }]
      },
      {
        program_id: 23,
        program_name: 'OFFERING AND TITHES',
        particulars: [
          {
            particular_id: 24,
            particular_name: 'Offering',
            quarters: [{
              quarter_id: 9,
              quarter: 'Q1',
              year: 2026,
              value: 1200,
              monthly_values: { January: 100, February: 400, March: 700 },
              date_submitted: null,
              district_endorse: null,
              mission_approve: null
            }]
          },
          {
            particular_id: 25,
            particular_name: 'Tithes',
            quarters: [{
              quarter_id: 9,
              quarter: 'Q1',
              year: 2026,
              value: 3400,
              date_submitted: null,
              district_endorse: null,
              mission_approve: null
            }]
          }
        ]
      }
    ];

    const program = component.getSelectedProgram()!;
    expect(component.isStewardshipReport).toBe(true);
    expect(component.getVisibleSections(program).map(section => section.program_name))
      .toEqual(['STEWARDSHIP', 'OFFERING AND TITHES']);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('STEWARDSHIP');
    expect(fixture.nativeElement.textContent).toContain('OFFERING AND TITHES');
    expect(component.getStewardshipTotal('offering')).toBe(1200);
    expect(component.getStewardshipTotal('tithe')).toBe(3400);
    expect(component.getQuarterMonthNames(component.getSelectedQuarter()!))
      .toEqual(['January', 'February', 'March']);
    expect(fixture.nativeElement.textContent).toContain('January');
  });

  it('opens the first report section by default', () => {
    const accordions = fixture.nativeElement.querySelectorAll('details');
    expect(accordions.length).toBe(2);
    expect(accordions[0].open).toBe(true);
    expect(accordions[1].open).toBe(false);
  });

  it('returns to Pastor monitoring when Back is clicked', () => {
    component.backToPrograms();

    expect(navigate).toHaveBeenCalledWith(['/pastor/reports/details']);
  });

  it('opens and closes the comments chathead panel', () => {
    component.openComments();
    expect(component.mobileCommentsOpen).toBe(true);

    component.closeComments();
    expect(component.mobileCommentsOpen).toBe(false);
  });

  it('shows representative replies with other comments in the selected quarter', () => {
    component.availableQuarters = [
      { quarter_id: 9, quarter: 'Q1', year: 2026 },
      { quarter_id: 10, quarter: 'Q2', year: 2026 }
    ];
    component.selectedYear = 2026;
    component.selectedQuarterId = 9;
    component.comments = [
      {
        comment_id: 1,
        quarter_id: 9,
        commented_by: 1,
        details: 'Pastor message',
        date_commented: '2026-10-20',
        commenter_role: 'pastor'
      },
      {
        comment_id: 2,
        quarter_id: 9,
        commented_by: 2,
        details: 'Representative reply',
        date_commented: '2026-10-21',
        commenter_role: 'representative'
      },
      {
        comment_id: 3,
        quarter_id: 10,
        commented_by: 3,
        details: 'Other quarter message',
        date_commented: '2026-10-22',
        commenter_role: 'assistant'
      }
    ];

    expect(component.getVisibleComments().map(comment => comment.details)).toEqual([
      'Pastor message',
      'Representative reply'
    ]);
  });

  it('lets pastors edit and submit embedded Ministerial and Mission reports', () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('departmentId', 16);
    fixture.componentRef.setInput('churchId', 2);
    component.currentUserRole = 'pastor';
    component.report = {
      department: { department_name: 'Ministerial & Evangelism' },
      programs: [{
        program_id: 1,
        program_name: 'Quarterly Report',
        sections: [{
          program_id: 2,
          program_name: 'Section',
          particulars: [{
            particular_id: 3,
            particular_name: 'Members visited',
            quarters: [{
              quarter_id: 9,
              quarter: 'Q1',
              year: 2026,
              value: 45,
              date_submitted: null,
              district_endorse: null,
              mission_approve: null
            }]
          }]
        }]
      }]
    };
    component.availableQuarters = [{ quarter_id: 9, quarter: 'Q1', year: 2026 }];
    component.availableYears = [2026];
    component.selectedYear = 2026;
    component.selectedQuarterId = 9;
    component.selectedProgramId = 1;
    fixture.detectChanges();

    expect(component.canEditDepartmentReport).toBe(true);
    component.departmentId = 20;
    expect(component.canEditDepartmentReport).toBe(true);
    component.departmentId = 16;
    expect(component.loading).toBe(false);
    expect(component.getSelectedProgram()).not.toBeNull();
    expect(component.getSelectedQuarter()).not.toBeNull();
    const selectedProgram = component.getSelectedProgram()!;
    const selectedQuarter = component.getSelectedQuarter()!;
    expect(component.getParticularQuarterRecord(
      selectedProgram.sections[0].particulars[0],
      selectedQuarter
    )).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="number"]')?.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Submit report');
    expect(fixture.nativeElement.textContent).not.toContain('Endorse to assistant');

    component.submitPersonalReport();

    expect(saveDepartmentReport).toHaveBeenCalledWith(2, 16, [{
      particular_id: 3,
      quarter_id: 9,
      value: 45
    }], true);
  });
});
