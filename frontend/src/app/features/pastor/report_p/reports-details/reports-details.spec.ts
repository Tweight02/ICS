import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { CURRENT_REPORT_YEAR } from '../../../../core/utils/report-year';
import { ReportsDetails } from './reports-details';

describe('ReportsDetails', () => {
  let component: ReportsDetails;
  let fixture: ComponentFixture<ReportsDetails>;
  let navigate: ReturnType<typeof vi.fn>;
  let getDepartments: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigate = vi.fn();
    getDepartments = vi.fn().mockReturnValue(of([
      {
        department_id: 4,
        department_name: 'Youth',
        q1_data_progress: 50,
        q2_data_progress: 75,
        q2_submitted: true,
        q3_data_progress: 100,
        q3_approved: true
      },
      { department_id: 16, department_name: 'Ministerial & Evangelism' },
      { department_id: 20, department_name: 'Adventist Mission' },
      { department_id: 22, department_name: 'Baptism Record' },
      { department_id: 23, department_name: 'Death Record' }
    ]));

    await TestBed.configureTestingModule({
      imports: [ReportsDetails],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({})
            }
          }
        },
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
        { provide: ReportService, useValue: { getDepartments } },
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

  it('expands a church inline to show department statuses and loads them once', () => {
    const church = component.churches()[0];

    component.toggleChurch(church);
    fixture.detectChanges();

    expect(component.isChurchOpen(church.church_id)).toBe(true);
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(getDepartments).toHaveBeenCalledWith(church.church_id, CURRENT_REPORT_YEAR);
    expect(fixture.nativeElement.textContent).toContain('Youth');
    expect(fixture.nativeElement.textContent).toContain('Needs completion');
    expect(fixture.nativeElement.textContent).toContain('Submitted for review');
    expect(fixture.nativeElement.textContent).toContain('Approved');
    expect(fixture.nativeElement.textContent).not.toContain('Ministerial & Evangelism');
    expect(fixture.nativeElement.textContent).not.toContain('Adventist Mission');
    expect(fixture.nativeElement.textContent).not.toContain('Baptism Record');
    expect(fixture.nativeElement.textContent).not.toContain('Death Record');
    expect(fixture.nativeElement.textContent).not.toContain('%');

    component.toggleChurch(church);
    component.toggleChurch(church);
    expect(getDepartments).toHaveBeenCalledOnce();
  });
});
