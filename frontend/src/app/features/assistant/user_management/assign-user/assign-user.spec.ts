import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
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
      { church_id: 2, district_name: 'South District', pastor_user_id: 6, pastor_name: 'Jonah Pastor' },
    ],
    pastors: [
      { user_id: 5, full_name: 'Amina Pastor' },
      { user_id: 6, full_name: 'Jonah Pastor' },
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

  it('opens a change-pastor dialog for an occupied district', () => {
    const changeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Open pastor assignment for North District"]'
    ) as HTMLButtonElement;

    changeButton.click();
    fixture.detectChanges();

    const pageText = fixture.nativeElement.textContent as string;
    expect(pageText).toContain('Change the pastor of North District');
    expect(pageText).toContain('Current pastor: Amina Pastor');
    expect(pageText).toContain('Jonah Pastor');
    expect(pageText).toContain('When both districts have a pastor, they will swap districts.');
  });

  it('hides the pastor search bar after a pastor is selected', () => {
    component.openTransfer(response.assignments[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#pastor-search')).not.toBeNull();

    component.selectPastor(response.pastors[1]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#pastor-search')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Jonah Pastor');
  });

  it('asks for approval before swapping pastors and reloads assignments after success', async () => {
    const swalFire = vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
    });
    component.openTransfer(response.assignments[0]);
    component.selectPastor(response.pastors[1]);
    await component.submitTransfer();

    expect(swalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Confirm pastor transfer',
      text: 'Jonah Pastor will move from South District to North District, and Amina Pastor will move to South District.',
      showCancelButton: true,
      confirmButtonText: 'Approve transfer',
    }));
    expect(assignPastorToDistrict).toHaveBeenCalledWith(1, 6);
    expect(getDistrictPastorAssignments).toHaveBeenCalledTimes(2);
  });

  it('does not submit the transfer when confirmation is cancelled', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
      dismiss: Swal.DismissReason.cancel,
    });
    component.openTransfer(response.assignments[0]);
    component.selectPastor(response.pastors[1]);

    await component.submitTransfer();

    expect(assignPastorToDistrict).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
