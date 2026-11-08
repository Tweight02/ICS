import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportsDetails } from './reports-details';

describe('ReportsDetails', () => {
  let component: ReportsDetails;
  let fixture: ComponentFixture<ReportsDetails>;
  let navigate: ReturnType<typeof vi.fn>;
  let returnQueryParams: Record<string, string>;

  beforeEach(async () => {
    navigate = vi.fn();
    returnQueryParams = {
      return_to: 'monitoring',
      return_department: '17',
      return_expanded: '1',
      return_search: 'North',
      return_scroll: '240'
    };
    await TestBed.configureTestingModule({
      imports: [ReportsDetails],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              get queryParamMap() {
                return convertToParamMap(returnQueryParams);
              }
            }
          }
        },
        {
          provide: ChurchService,
          useValue: {
            getChurches: () => of({
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
        { provide: Router, useValue: { url: '/assistant/reports/details/1', navigate } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows saved church progress before report submission', () => {
    expect(component.getMonitoring(2).q1).toEqual({
      progress: 50,
      approved: false
    });
  });

  it('preserves monitoring state when returning to monitoring', () => {
    component.backToDistricts();

    expect(navigate).toHaveBeenCalledWith(
      ['/assistant/reports'],
      { queryParams: returnQueryParams }
    );
  });

  it('preserves monitoring state when opening department reports', () => {
    component.openDepartmentReports();

    expect(navigate).toHaveBeenCalledWith(
      ['/assistant/reports/programs'],
      {
        queryParams: {
          district_id: 1,
          district_name: 'Batanes',
          ...returnQueryParams
        }
      }
    );
  });
});
