import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserService } from '../../../../core/services/user/user-service';
import { NewUser } from './new-user';

describe('NewUser', () => {
  let component: NewUser;
  let fixture: ComponentFixture<NewUser>;

  const userService = {
    getDistricts: vi.fn().mockReturnValue(of({ success: true, data: [] })),
  };

  beforeEach(async () => {
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows an empty middle name', () => {
    expect(component.form.controls.middle_name.valid).toBe(true);
  });
});
