import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportsDetails } from './reports-details';

describe('ReportsDetails', () => {
  let component: ReportsDetails;
  let fixture: ComponentFixture<ReportsDetails>;
  let navigate: ReturnType<typeof vi.fn>;
  let getDepartments: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigate = vi.fn();
    getDepartments = vi.fn(() => of([
      {
        department_id: 4,
        department_name: 'Education',
        q1_approved: false,
        q1_data_progress: 50
      },
      {
        department_id: 22,
        department_name: 'Baptism Record'
      }
    ]));

    await TestBed.configureTestingModule({
      imports: [ReportsDetails],
      providers: [
        {
          provide: ChurchService,
          useValue: {
            getMyDistrictChurches: () => of({
              success: true,
              district: {
                church_id: 1,
                name: 'Batanes',
                address: null,
                parent_id: null
              },
              data: [{
                church_id: 2,
                name: 'Pasuc',
                address: null,
                parent_id: 1,
                monitoring: {
                  q1: 50,
                  q1_submitted_data_progress: null,
                  q1_approved: false,
                  q2: null,
                  q3: null,
                  q4: null
                }
              }]
            })
          }
        },
        {
          provide: ReportService,
          useValue: { getDepartments }
        },
        { provide: Router, useValue: { url: '/pastor/reports/details', navigate } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the personal report from the reports page button', () => {
    component.openPersonalReport();

    expect(navigate).toHaveBeenCalledWith(['/pastor/baptism']);
  });

  it('expands a church and loads its department list', () => {
    component.toggleChurch(2);

    expect(component.isChurchOpen(2)).toBe(true);
    expect(getDepartments).toHaveBeenCalledWith(2);
    expect(component.loadingDepartments()[2]).toBe(false);
    expect(component.getReportDepartments(2).map(department => department.department_name))
      .toEqual(['Education']);
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.monitoring-personal-reports')).toBeNull();
  });

  it('shows a green data state for quarters with data and a check for approved quarters', () => {
    const department = {
      department_id: 4,
      department_name: 'Education',
      q1_data_progress: 25,
      q2_submitted: true,
      q3_approved: true
    };

    expect(component.hasDepartmentData(department, 'q1')).toBe(true);
    expect(component.hasDepartmentData(department, 'q2')).toBe(true);
    expect(component.hasDepartmentData(department, 'q4')).toBe(false);
    expect(component.isDepartmentApproved(department, 'q3')).toBe(true);
  });

  it('opens a department report for the expanded church', () => {
    component.toggleChurch(2);
    component.openDepartment({ department_id: 4, department_name: 'Education' });

    expect(navigate).toHaveBeenCalledWith([
      '/pastor/reports/particulars',
      4,
      1,
      2
    ]);
  });
});
