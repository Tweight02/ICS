import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportPrograms } from './report-programs';

describe('ReportPrograms', () => {
  let component: ReportPrograms;
  let fixture: ComponentFixture<ReportPrograms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportPrograms],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ districtId: '1', churchId: '2' })),
            snapshot: {
              queryParamMap: convertToParamMap({
                district_name: 'Batanes',
                church_name: 'Pasuc'
              })
            }
          }
        },
        {
          provide: ReportService,
          useValue: {
            getDepartments: () => of([
              {
                department_id: 4,
                department_name: 'Youth',
                q1_approved: false,
                q1_data_progress: 50,
                q1_submitted_data_progress: null,
                q2_approved: false,
                q2_data_progress: 75,
                q2_submitted: true,
                q3_approved: true,
                q3_data_progress: 100
              },
              { department_id: 16, department_name: 'Ministerial & Evangelism' },
              { department_id: 20, department_name: 'Adventist Mission' },
              { department_id: 22, department_name: 'Baptism Record' },
              { department_id: 23, department_name: 'Death Record' }
            ])
          }
        },
        { provide: ChurchService, useValue: { getChurches: () => of({ district: { name: 'Batanes' }, data: [] }) } },
        { provide: Router, useValue: { url: '/pastor/reports/programs/1/2', navigate: () => undefined } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportPrograms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows saved report progress before the representative submits it', () => {
    expect(component.getMonitoring(0).q1).toEqual({
      progress: 50,
      approved: false,
      submitted: false
    });

    const cells = Array.from(fixture.nativeElement.querySelectorAll('tbody tr:first-child td')) as HTMLTableCellElement[];
    expect(cells[0].textContent).toContain('Needs completion');
    expect(cells[0].textContent).not.toContain('%');
    expect(cells[1].textContent).toContain('Submitted for review');
    expect(cells[2].textContent.trim()).toBe('✓');
    expect(cells[2].querySelector('[aria-label="Approved"]')).not.toBeNull();
  });

  it('groups the four personal-report departments separately', () => {
    expect(component.reportDepartments.map(department => department.department_id))
      .toEqual([4]);
    expect(component.personalReportDepartments.map(department => department.department_id))
      .toEqual([16, 20, 22, 23]);
  });
});
