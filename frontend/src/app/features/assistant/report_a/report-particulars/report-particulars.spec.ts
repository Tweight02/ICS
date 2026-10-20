import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportParticulars } from './report-particulars';

describe('ReportParticulars', () => {
  let component: ReportParticulars;
  let fixture: ComponentFixture<ReportParticulars>;

  beforeEach(async () => {
    const paramMap = convertToParamMap({ departmentId: '0' });
    const queryParamMap = convertToParamMap({});

    await TestBed.configureTestingModule({
      imports: [ReportParticulars],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(paramMap),
            queryParamMap: of(queryParamMap),
            snapshot: { paramMap, queryParamMap }
          }
        },
        { provide: Router, useValue: { navigate: vi.fn(), url: '' } },
        { provide: AuthService, useValue: { getCurrentUser: () => null } },
        {
          provide: ReportService,
          useValue: { getDepartmentComments: () => of({ data: [] }) }
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

  it('opens and closes the comments chathead panel', () => {
    component.openComments();
    expect(component.mobileCommentsOpen).toBe(true);

    component.closeComments();
    expect(component.mobileCommentsOpen).toBe(false);
  });
});
