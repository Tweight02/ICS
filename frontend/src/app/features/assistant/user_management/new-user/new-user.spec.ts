import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { UserService } from '../../../../core/services/user/user-service';
import { NewUser } from './new-user';

describe('NewUser', () => {
  let component: NewUser;
  let fixture: ComponentFixture<NewUser>;

  const userService = {
    getDistricts: vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { church_id: 1, name: 'North District', address: null, parent_id: null },
        { church_id: 2, name: 'South District', address: null, parent_id: null },
      ],
    })),
    checkDistrictPastor: vi.fn().mockReturnValue(of({ exists: false })),
    createUser: vi.fn().mockReturnValue(of({})),
  };

  beforeEach(async () => {
    userService.checkDistrictPastor.mockReturnValue(of({ exists: false }));
    userService.createUser.mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [NewUser],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows an empty middle name', () => {
    expect(component.form.controls.middle_name.valid).toBe(true);
  });

  it('shows all districts, including districts that may already have a pastor', () => {
    expect(component.districts.map((district) => district.name)).toEqual([
      'North District',
      'South District',
    ]);
  });

  it('notifies when the selected district already has a pastor', () => {
    const fireSpy = vi.spyOn(Swal, 'fire').mockResolvedValue({} as never);
    userService.checkDistrictPastor.mockReturnValue(of({
      exists: true,
      pastor: { user_id: 10, first_name: 'Amina', last_name: 'Pastor' },
    }));
    component.form.setValue({
      first_name: 'Test',
      middle_name: '',
      last_name: 'User',
      extension_name: '',
      birthdate: '1980-01-01',
      gender: 'other',
      department_id: 16,
      church_id: '1',
      email: 'test@example.com',
      password: 'password123',
    });

    component.onSubmit();

    expect(fireSpy).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'District already has a pastor',
      text: 'Amina Pastor is already assigned to this district.',
    }));
  });

  it('shows a notification when the email address is already in use', () => {
    const fireSpy = vi.spyOn(Swal, 'fire').mockResolvedValue({} as never);
    userService.createUser.mockReturnValue(throwError(() => ({
      error: { errors: { email: ['The email has already been taken.'] } },
    })));
    component.form.setValue({
      first_name: 'Test',
      middle_name: '',
      last_name: 'User',
      extension_name: '',
      birthdate: '1980-01-01',
      gender: 'other',
      department_id: 16,
      church_id: '1',
      email: 'existing@example.com',
      password: 'password123',
    });

    component.onSubmit();

    expect(fireSpy).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'Email already in use',
      text: 'An account with this email address already exists.',
    }));
  });
});
