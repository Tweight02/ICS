import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { Reports } from './reports';

describe('Reports', () => {
  let component: Reports;
  let fixture: ComponentFixture<Reports>;
  let navigation: {
    commands: Array<string | number>;
    extras?: { queryParams?: Record<string, string> };
  } | undefined;

  beforeEach(async () => {
    navigation = undefined;

    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        {
          provide: ChurchService,
          useValue: {
            getDistricts: () => of({ success: true, data: [] })
          }
        },
        { provide: ReportService, useValue: {} },
        {
          provide: Router,
          useValue: {
            url: '/assistant/reports',
            navigate: (
              commands: Array<string | number>,
              extras?: { queryParams?: Record<string, string> }
            ) => {
              navigation = { commands, extras };
              return Promise.resolve(true);
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the personal report page directly from monitoring', () => {
    component.openPersonalReport(7, 8);

    expect(navigation).toEqual({
      commands: ['/assistant/reports/records', 22, 7, 8],
      extras: { queryParams: { return_to: 'monitoring' } }
    });
  });
});
