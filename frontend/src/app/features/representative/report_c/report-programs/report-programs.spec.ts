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
      church_id: 1
    });

    getDepartments = vi.fn().mockReturnValue(of([{
      department_id: 4,
      department_name: 'Youth',
      q1_approved: false,
      q1_data_progress: 50,
      q2_approved: true,
      q2_data_progress: 100,
      q3_approved: true,
      q3_data_progress: 0
    }]));
    const getAllChurches = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { church_id: 1, name: 'Batanes', address: null, parent_id: null },
        { church_id: 2, name: 'Pasuc', address: null, parent_id: 1 }
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

  it('resolves a district assignment to its sole local church', () => {
    expect(getDepartments).toHaveBeenCalledOnce();
    expect(getDepartments).toHaveBeenCalledWith(2);
    expect(component.churchName).toBe('Pasuc');
    expect(component.districtName).toBe('Batanes');
  });

  it('shows quarter data progress separately from approval', () => {
    const monitoring = component.getMonitoring(0);

    expect(monitoring.q1).toEqual({ progress: 50, approved: false });
    expect(monitoring.q2).toEqual({ progress: 100, approved: true });

    const quarterCells = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr td')
    ).slice(1) as HTMLTableCellElement[];
    expect(quarterCells.map(cell => cell.textContent.trim())).toEqual([
      '50%',
      '✓',
      '-',
      '-'
    ]);
  });
});
