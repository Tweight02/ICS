import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { DeathbapComponent } from './deathbap';

describe('Deathbap', () => {
  let component: DeathbapComponent;
  let fixture: ComponentFixture<DeathbapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeathbapComponent],
      providers: [
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of({ data: [] })) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { url: '/pastor/deathbap', navigate: vi.fn() } },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ role: 'pastor', user_id: 1 }) } },
        {
          provide: ChurchService,
          useValue: {
            getMyDistrictChurches: () => of({
              success: true,
              district: { church_id: 1, name: 'District', address: '', parent_id: null },
              data: []
            })
          }
        },
        { provide: ReportService, useValue: { getDepartmentComments: () => of({ data: [] }) } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeathbapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows one district-owned report for both Pastor personal report types', () => {
    component.churches = [
      { church_id: 2, name: 'Church One', address: '', parent_id: 1 },
      { church_id: 3, name: 'Church Two', address: '', parent_id: 1 }
    ];
    component.districtId = 1;
    component.districtName = 'North District';
    component.isReadOnly = false;

    for (const reportType of ['ministerial', 'mission'] as const) {
      component.selectedRecord = reportType;

      expect(component.reportChurches).toEqual([{
        church_id: 1,
        name: 'North District',
        address: '',
        parent_id: null
      }]);
      expect(component.reportChurches[0]).toBe(component.reportChurches[0]);
    }
  });

  it('keeps read-only personal reports scoped to the routed church', () => {
    component.churches = [
      { church_id: 2, name: 'Church One', address: '', parent_id: 1 },
      { church_id: 3, name: 'Church Two', address: '', parent_id: 1 }
    ];
    component.selectedRecord = 'ministerial';
    component.isReadOnly = true;
    component.churchId = 3;

    expect(component.reportChurches.map(church => church.name))
      .toEqual(['Church Two']);
  });
});
