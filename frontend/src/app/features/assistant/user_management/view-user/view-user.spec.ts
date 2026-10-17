import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserService } from '../../../../core/services/user/user-service';
import { ViewUser } from './view-user';

describe('ViewUser', () => {
  let component: ViewUser;
  let fixture: ComponentFixture<ViewUser>;

  const userService = {
    getDistricts: vi.fn().mockReturnValue(of({ success: true, data: [] })),
    getPastors: vi.fn().mockReturnValue(of({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      from: null,
      to: null,
    })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewUser],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to assignments and does not render district transfer controls', () => {
    const pageText = fixture.nativeElement.textContent as string;

    expect(pageText).toContain('District Pastor Assignments');
    expect(pageText).not.toContain('District Transfer');
    expect(pageText).not.toContain('Review Transfers');
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
