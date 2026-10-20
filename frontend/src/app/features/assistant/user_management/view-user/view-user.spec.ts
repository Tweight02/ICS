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

  it('filters district options by typed name and applies the selected district', () => {
    component.districts.set([
      { church_id: 1, name: 'North District', address: null, parent_id: null },
      { church_id: 2, name: 'South District', address: null, parent_id: null },
    ]);
    userService.getPastors.mockClear();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#district-filter') as HTMLInputElement;
    input.value = 'north';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('North District');

    (options[0] as HTMLElement).click();
    fixture.detectChanges();

    expect(component.churchId()).toBe('1');
    expect(userService.getPastors).toHaveBeenCalledWith(expect.objectContaining({ church_id: '1' }));
  });
});
