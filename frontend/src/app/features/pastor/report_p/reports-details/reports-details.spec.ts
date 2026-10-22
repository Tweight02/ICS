import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportsDetails } from './reports-details';

describe('ReportsDetails', () => {
  let component: ReportsDetails;
  let fixture: ComponentFixture<ReportsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsDetails],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } }
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
        { provide: Router, useValue: { url: '/pastor/reports/details', navigate: () => undefined } }
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
});
