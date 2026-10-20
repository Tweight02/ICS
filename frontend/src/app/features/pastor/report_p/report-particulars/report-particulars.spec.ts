import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
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
            snapshot: { paramMap, queryParamMap }
          }
        },
        { provide: Router, useValue: { navigate: vi.fn(), url: '' } },
        { provide: AuthService, useValue: { getCurrentUser: () => null } },
        { provide: ChurchService, useValue: {} },
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
});
