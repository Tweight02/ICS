import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth/auth-service';
import { ChurchService } from '../../core/services/church/church-service';
import { ProfileComponent } from './profile';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let getDepartments: ReturnType<typeof vi.fn>;
  let currentUser: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: 'director' | 'pastor' | 'representative';
    department_id: number;
    church_id: number;
  };

  beforeEach(async () => {
    currentUser = {
      user_id: 1,
      first_name: 'Taylor',
      last_name: 'User',
      email: 'taylor@example.com',
      role: 'pastor',
      department_id: 16,
      church_id: 2
    };
    getDepartments = vi.fn().mockReturnValue(of({
      success: true,
      data: [{ department_id: 16, department_name: 'Ministerial & Evangelism' }]
    }));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => null,
            getProfile: () => of(currentUser)
          }
        },
        {
          provide: ChurchService,
          useValue: {
            getDepartments,
            getAllChurches: () => of({
              success: true,
              data: [
                { church_id: 1, name: 'District', parent_id: null },
                { church_id: 2, name: 'Church', parent_id: 1 }
              ]
            })
          }
        },
        { provide: Location, useValue: { back: vi.fn() } }
      ]
    }).compileComponents();
  });

  async function createComponent(): Promise<void> {
    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('hides department assignment for non-directors', async () => {
    await createComponent();

    const assignment = fixture.nativeElement.querySelector('[aria-labelledby="assignment-heading"]');
    expect(assignment.textContent).not.toContain('Department');
    expect(assignment.textContent).not.toContain('Ministerial & Evangelism');
    expect(assignment.textContent).toContain('Church');
    expect(getDepartments).not.toHaveBeenCalled();
  });

  it('shows department assignment for directors', async () => {
    currentUser.role = 'director';
    await createComponent();

    const assignment = fixture.nativeElement.querySelector('[aria-labelledby="assignment-heading"]');
    expect(assignment.textContent).toContain('Department');
    expect(assignment.textContent).toContain('Ministerial & Evangelism');
    expect(getDepartments).toHaveBeenCalledOnce();
  });
});
