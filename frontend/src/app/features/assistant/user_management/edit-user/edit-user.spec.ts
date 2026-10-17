import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserService } from '../../../../core/services/user/user-service';
import { EditUser } from './edit-user';

describe('EditUser', () => {
  let component: EditUser;
  let fixture: ComponentFixture<EditUser>;

  const pastor = {
    user_id: 7,
    first_name: 'Amina',
    middle_name: null,
    last_name: 'Pastor',
    extension_name: null,
    birthdate: '1980-01-01',
    gender: 'female' as const,
    email: 'amina@example.com',
    role: 'pastor' as const,
    department_id: 16,
    church_id: 3,
    church: { church_id: 3, name: 'North District' },
    status: 'active' as const,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditUser],
      providers: [
        provideRouter([]),
        {
          provide: UserService,
          useValue: {
            getDepartments: vi.fn().mockReturnValue(of({ data: [] })),
            getPastor: vi.fn().mockReturnValue(of({ data: pastor })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the assigned district visible but outside the editable form', () => {
    expect(component.form.get('church_id')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('North District');
  });
});
