import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, LoginResponse } from '../../core/services/auth/auth-service';
import { UserRole } from '../../core/models/user.model';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let navigate: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let login: ReturnType<typeof vi.fn>;

  const loginResponse = (role: UserRole): LoginResponse => ({
    message: 'Login successful',
    token_type: 'Bearer',
    token: 'test-token',
    user: {
      user_id: 1,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role,
    },
  });

  beforeEach(async () => {
    navigate = vi.fn();
    navigateByUrl = vi.fn();
    login = vi.fn(() => of(loginResponse('pastor')));

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: { login } },
        { provide: Router, useValue: { navigate, navigateByUrl } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the first Pastor sidebar page after login', () => {
    component.credentials.setValue({
      email: 'pastor@example.com',
      password: 'password',
      remember: true
    });

    component.submit();

    expect(navigateByUrl).toHaveBeenCalledWith('/pastor/view-representatives');
  });

  it('opens the first Assistant sidebar page after login', () => {
    component.credentials.setValue({
      email: 'assistant@example.com',
      password: 'password',
      remember: true
    });

    login.mockReturnValue(of(loginResponse('assistant')));

    component.submit();

    expect(navigateByUrl).toHaveBeenCalledWith('/assistant/view-user');
  });
});
