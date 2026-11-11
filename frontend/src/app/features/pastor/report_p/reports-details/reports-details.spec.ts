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

  it('opens the summary report from the reports page button for the selected year', () => {
    component.openSummaryReport();

    expect(navigate).toHaveBeenCalledWith(['/pastor/reports/summary'], {
      queryParams: { year: CURRENT_REPORT_YEAR }
    });
  });

  it('shows the summary report button beside the personal report button', () => {
    const personalReportButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Personal Report'));
    const summaryReportButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Summary Report'));

    expect(personalReportButton).toBeTruthy();
    expect(summaryReportButton).toBeTruthy();
    expect(personalReportButton?.parentElement).toBe(summaryReportButton?.parentElement);
  });

  it('expands a church inline to show department statuses and loads them once', () => {
    const church = component.churches()[0];

    component.toggleChurch(church);
    fixture.detectChanges();

    expect(component.isChurchOpen(church.church_id)).toBe(true);
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(getDepartments).toHaveBeenCalledWith(church.church_id, CURRENT_REPORT_YEAR);
    expect(fixture.nativeElement.textContent).toContain('Youth');
    expect(fixture.nativeElement.textContent).toContain('In progress');
    expect(fixture.nativeElement.textContent).toContain('Submitted');
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

  it('opens a department report with return context for the expanded church', () => {
    const church = component.churches()[0];
    component.openDepartment(church, {
      department_id: 4,
      department_name: 'Youth'
    });

    expect(navigate).toHaveBeenCalledWith(
      ['/pastor/reports/particulars', 4, 1, 2],
      {
        queryParams: {
          year: CURRENT_REPORT_YEAR,
          return_to: 'district-reports',
          return_church: '2',
          return_scroll: String(window.scrollY)
        }
      }
    );
  });

  it('restores the expanded church after returning from a department report', async () => {
    const route = TestBed.inject(ActivatedRoute);
    Object.defineProperty(route.snapshot, 'queryParamMap', {
      value: convertToParamMap({
        year: String(CURRENT_REPORT_YEAR),
        return_to: 'district-reports',
        return_church: '2',
        return_scroll: '240'
      }),
      configurable: true
    });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    fixture.destroy();
    fixture = TestBed.createComponent(ReportsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isChurchOpen(2)).toBe(true);
    expect(getDepartments).toHaveBeenCalledWith(2, CURRENT_REPORT_YEAR);
    await vi.waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 240));
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {
        return_to: null,
        return_church: null,
        return_scroll: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }));
    scrollTo.mockRestore();
  });
});
