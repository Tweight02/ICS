import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserService } from '../../../../core/services/user/user-service';
import { AssignUser } from './assign-user';

describe('AssignUser', () => {
  let component: AssignUser;
  let fixture: ComponentFixture<AssignUser>;
  let assignPastorToDistrict: ReturnType<typeof vi.fn>;
  let getDistrictPastorAssignments: ReturnType<typeof vi.fn>;

  const response = {
    assignments: [
      { church_id: 1, district_name: 'North District', pastor_user_id: 5, pastor_name: 'Amina Pastor' },
      { church_id: 2, district_name: 'South District', pastor_user_id: null, pastor_name: null },
    ],
    pastors: [
      { user_id: 5, full_name: 'Amina Pastor' },
    ],
  };

  beforeEach(async () => {
    assignPastorToDistrict = vi.fn().mockReturnValue(of({ message: 'Pastor assigned.' }));
    getDistrictPastorAssignments = vi.fn().mockReturnValue(of(response));

    await TestBed.configureTestingModule({
      imports: [AssignUser],
      providers: [
        provideRouter([]),
        {
          provide: UserService,
          useValue: { assignPastorToDistrict, getDistrictPastorAssignments },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only district and pastor names in assignment entries', () => {
    const pageText = fixture.nativeElement.textContent as string;

    expect(pageText).toContain('North District');
    expect(pageText).toContain('Amina Pastor');
    expect(pageText).toContain('No pastor assigned');
    expect(pageText).not.toContain('North region');
  });

  it('keeps selected values visible while removing them from available choices', () => {
    component.form.setValue({ district_id: '2', user_id: '5' });

    expect(component.selectedLabel('district_id')).toBe('South District');
    expect(component.selectedLabel('user_id')).toBe('Amina Pastor');
    expect(component.optionsFor('district_id')).toEqual([]);
    expect(component.optionsFor('user_id')).toEqual([]);
  });

  it('assigns a selected pastor and reloads assignments after success', () => {
    component.form.setValue({ district_id: '2', user_id: '5' });

    component.onSubmit();

    expect(assignPastorToDistrict).toHaveBeenCalledWith(2, 5);
    expect(getDistrictPastorAssignments).toHaveBeenCalledTimes(2);
    expect(component.successMessage()).toBe('Pastor assigned.');
  });

  it('does not submit when the selection is incomplete', () => {
    component.onSubmit();

    expect(assignPastorToDistrict).not.toHaveBeenCalled();
    expect(component.form.controls.district_id.touched).toBe(true);
  });
});
