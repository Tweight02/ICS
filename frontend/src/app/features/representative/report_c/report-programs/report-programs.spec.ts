import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportPrograms } from '../../../pastor/report_p/report-programs/report-programs';

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

    getDepartments = vi.fn().mockReturnValue(of([
      {
        department_id: 4,
        department_name: 'Youth',
        q1_approved: false,
        q1_data_progress: 50,
        q2_approved: true,
        q2_data_progress: 100,
        q3_approved: true,
        q3_data_progress: 0
      },
      { department_id: 16, department_name: 'Ministerial & Evangelism' },
      { department_id: 20, department_name: 'Adventist Mission' },
      { department_id: 22, department_name: 'Baptism Record' },
      { department_id: 23, department_name: 'Death Record' },
      { department_id: 30, department_name: 'Other Department' }
    ]));
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
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) }
          }
        },
        { provide: AuthService, useValue: { getCurrentUser } },
        { provide: ChurchService, useValue: { getAllChurches } },
        { provide: ReportService, useValue: { getDepartments } },
        { provide: Router, useValue: { url: '/representative/reports/programs', navigate: vi.fn() } }
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

  it('shows quarter review states without progress percentages in the table', () => {
    const monitoring = component.getMonitoring(0);

    expect(monitoring.q1).toEqual({ progress: 50, approved: false, submitted: false });
    expect(monitoring.q2).toEqual({ progress: 100, approved: true, submitted: false });

    const quarterCells = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr')[0].querySelectorAll('td')
    ) as HTMLTableCellElement[];
    expect(quarterCells[0].textContent).toContain('Needs completion');
    expect(quarterCells[0].textContent).not.toContain('%');
    expect(quarterCells[1].textContent.trim()).toBe('✓');
    expect(quarterCells[1].querySelector('[aria-label="Approved"]')).not.toBeNull();
    expect(quarterCells[2].textContent.trim()).toBe('✓');
    expect(quarterCells[3].textContent.trim()).toBe('-');
  });

  it('shows submitted progress and an explicit review status in the table', () => {
    const youth = component.departments.find(department => department.department_name === 'Youth');
    expect(youth).toBeDefined();
    youth!.q1_submitted = true;
    expect(component.getMonitoring(0).q1).toEqual({
      progress: 50,
      approved: false,
      submitted: true
    });
  });

  it('shows all departments except pastor personal report departments', () => {
    expect(component.representativeDepartments.map(department => department.department_id)).toEqual([4, 30]);
  });

  it('shows report status in the table without a separate notification banner', () => {
    const quarterCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(2)') as HTMLTableCellElement;
    expect(quarterCell.textContent).toContain('Needs completion');
    expect(quarterCell.textContent).not.toContain('%');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('maps submitted state into the quarter monitoring data', () => {
    const youth = component.departments.find(department => department.department_name === 'Youth');
    expect(youth).toBeDefined();
    youth!.q1_submitted = true;
    expect(component.getMonitoring(0).q1).toEqual({
      progress: 50,
      approved: false,
      submitted: true
    });
  });
});
