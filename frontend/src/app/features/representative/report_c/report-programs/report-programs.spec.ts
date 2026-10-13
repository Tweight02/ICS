import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportPrograms } from './report-programs';

describe('ReportPrograms', () => {
  let component: ReportPrograms;
  let fixture: ComponentFixture<ReportPrograms>;
  let getDepartments: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const getCurrentUser = vi.fn().mockReturnValue({
      user_id: 7,
      first_name: 'Casey',
      last_name: 'Representative',
      email: 'casey@example.com',
      role: 'representative',
      church_id: 42
    });

    getDepartments = vi.fn().mockReturnValue(of([]));
    const getAllChurches = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { church_id: 8, name: 'North District', address: null, parent_id: null },
        { church_id: 42, name: 'River Church', address: null, parent_id: 8 }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [ReportPrograms],
      providers: [
        { provide: AuthService, useValue: { getCurrentUser } },
        { provide: ChurchService, useValue: { getAllChurches } },
        { provide: ReportService, useValue: { getDepartments } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportPrograms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads departments for the signed-in representative church', () => {
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(getDepartments).toHaveBeenCalledWith(42);
    expect(component.churchName).toBe('River Church');
    expect(component.districtName).toBe('North District');
  });
});
