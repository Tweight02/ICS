import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { RepresentativeService } from '../../../../core/services/representative/representative-service';
import { NewRepresentative } from './new-representative';

describe('NewRepresentative', () => {
  let component: NewRepresentative;
  let fixture: ComponentFixture<NewRepresentative>;
  const createRepresentative = vi.fn();
  const getAvailableChurches = vi.fn();

  beforeEach(async () => {
    createRepresentative.mockReturnValue(of({}));
    getAvailableChurches.mockReturnValue(of({ data: [{ church_id: 1, name: 'North Church' }] }));

    await TestBed.configureTestingModule({
      imports: [NewRepresentative],
      providers: [
        provideRouter([]),
        {
          provide: RepresentativeService,
          useValue: { create: createRepresentative, getAvailableChurches },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewRepresentative);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a notification when the email address is already in use', async () => {
    const fireSpy = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);
    createRepresentative.mockReturnValue(throwError(() => ({
      status: 422,
      error: { errors: { email: ['The email has already been taken.'] } },
    })));
    component.form.setValue({
      church_id: 1,
      first_name: 'Test',
      middle_name: '',
      last_name: 'User',
      extension_name: '',
      birthdate: '1980-01-01',
      gender: 'other',
      email: 'existing@example.com',
      password: 'password123',
    });

    await component.save();

    expect(fireSpy).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'Email already in use',
    }));
  });

  it('shows a notification when the same person already has an account', async () => {
    const fireSpy = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);
    createRepresentative.mockReturnValue(throwError(() => ({
      status: 422,
      error: { errors: { first_name: ['This person already has an account.'] } },
    })));
    component.form.setValue({
      church_id: 1,
      first_name: 'Test',
      middle_name: '',
      last_name: 'User',
      extension_name: '',
      birthdate: '1980-01-01',
      gender: 'other',
      email: 'different@example.com',
      password: 'password123',
    });

    await component.save();

    expect(fireSpy).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'User already exists',
    }));
  });
});
