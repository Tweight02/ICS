import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../../core/services/church/church-service';
import { RepresentativeService } from '../../../../core/services/representative/representative-service';
import { AssignChurch } from './assign-church';

describe('AssignChurch', () => {
  let component: AssignChurch;
  let fixture: ComponentFixture<AssignChurch>;
  const getMyDistrictChurches = vi.fn();
  const getRepresentatives = vi.fn();
  const transferRepresentatives = vi.fn();

  const churchList = [
    { church_id: 10, name: 'North Church', address: null, parent_id: 1 },
    { church_id: 20, name: 'South Church', address: null, parent_id: 1 },
  ];
  const representativeList = [
    {
      user_id: 5,
      first_name: 'Amina',
      middle_name: null,
      last_name: 'Leader',
      extension_name: null,
      birthdate: '1980-01-01',
      gender: 'female' as const,
      role: 'church_representative' as const,
      email: 'amina@example.com',
      status: 'active' as const,
      church_id: 10,
      department_id: 1,
    },
    {
      user_id: 7,
      first_name: 'Noah',
      middle_name: null,
      last_name: 'Leader',
      extension_name: null,
      birthdate: '1980-01-01',
      gender: 'male' as const,
      role: 'church_representative' as const,
      email: 'noah@example.com',
      status: 'inactive' as const,
      church_id: 20,
      department_id: 1,
    },
  ];

  beforeEach(async () => {
    getMyDistrictChurches.mockClear();
    getRepresentatives.mockClear();
    transferRepresentatives.mockClear();
    getMyDistrictChurches.mockReturnValue(of({
      success: true,
      district: { church_id: 1, name: 'District', address: null, parent_id: null },
      data: churchList,
    }));
    getRepresentatives.mockReturnValue(of({
      data: representativeList,
      current_page: 1,
      last_page: 1,
      total: 1,
      from: 1,
      to: 1,
    }));
    transferRepresentatives.mockReturnValue(of({
      message: '1 representative(s) transferred successfully.',
      transferred_count: 1,
    }));

    await TestBed.configureTestingModule({
      imports: [AssignChurch],
      providers: [
        provideRouter([]),
        { provide: ChurchService, useValue: { getMyDistrictChurches } },
        { provide: RepresentativeService, useValue: { getRepresentatives, transferRepresentatives } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignChurch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads church assignments and active and inactive representatives', () => {
    expect(component).toBeTruthy();
    expect(component.assignments()).toHaveLength(2);
    expect(component.assignments()[0].representative?.user_id).toBe(5);
    expect(component.vacantChurches().map((church) => church.name)).toEqual(['South Church']);
    expect(getRepresentatives).toHaveBeenCalledWith({ per_page: 100, page: 1 });
  });

  it('sorts church cards alphabetically down each of three columns', () => {
    const names = ['Zulu', 'Alpha', 'Echo', 'Charlie', 'Bravo', 'Golf', 'Delta'];
    component.assignments.set(names.map((name, index) => ({
      church_id: index + 100,
      name,
      representative: null,
    })));

    expect(component.visibleAssignmentColumns().map((column) => column.map(({ name }) => name)))
      .toEqual([
        ['Alpha', 'Bravo', 'Charlie'],
        ['Delta', 'Echo', 'Golf'],
        ['Zulu'],
      ]);
  });

  it('transfers the selected active representative to the vacant church', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
    });
    const target = component.assignments()[1];
    component.openAssignment(target);
    component.selectedRepresentativeId.set(5);

    await component.submitAssignment();

    expect(transferRepresentatives).toHaveBeenCalledWith([
      { user_id: 5, church_id: 20 },
    ]);
    expect(getRepresentatives).toHaveBeenCalledTimes(2);
  });

  it('shows active and inactive representatives in a selectable table in the assignment modal', () => {
    component.openAssignment(component.assignments()[1]);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table');
    expect(table.textContent).toContain('Representative');
    expect(table.textContent).toContain('Current church');
    expect(table.textContent).toContain('Amina Leader');
    expect(table.textContent).toContain('North Church');
    expect(table.textContent).toContain('Noah Leader');
    expect(table.textContent).toContain('Inactive');

    const inactiveRow = table.querySelectorAll('tbody tr')[1] as HTMLTableRowElement;
    inactiveRow.click();

    expect(component.selectedRepresentativeId()).toBe(7);
  });

  it('does not present an inactive representative as currently assigned to their previous church', () => {
    expect(component.sourceFor(representativeList[1])).toBeNull();
  });

  it('returns to representative selection when the modal cancel button is clicked after selection', () => {
    const target = component.assignments()[1];
    component.openAssignment(target);
    component.selectRepresentative(representativeList[0]);
    fixture.detectChanges();

    const cancelButton = Array.from(
      fixture.nativeElement.querySelectorAll('#assignment-dialog button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Back to selection');
    cancelButton?.click();
    fixture.detectChanges();

    expect(component.transferTarget()).toBe(target);
    expect(component.selectedRepresentativeId()).toBeNull();
    expect(fixture.nativeElement.querySelector('#representative-search')).not.toBeNull();
  });

  it('returns to representative selection when the transfer confirmation is cancelled', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    });
    const target = component.assignments()[1];
    component.openAssignment(target);
    component.selectRepresentative(representativeList[0]);

    await component.submitAssignment();
    fixture.detectChanges();

    expect(component.transferTarget()).toBe(target);
    expect(component.selectedRepresentativeId()).toBeNull();
    expect(fixture.nativeElement.querySelector('#representative-search')).not.toBeNull();
    expect(transferRepresentatives).not.toHaveBeenCalled();
  });

  it('deactivates the existing representative when transferring into an occupied church', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    });
    const currentRepresentative = representativeList[0];
    const replacement = {
      ...currentRepresentative,
      user_id: 6,
      first_name: 'Noah',
      last_name: 'Pastor',
      email: 'noah@example.com',
      church_id: 20,
    };
    component.representatives.set([...representativeList, replacement]);
    component.assignments.set([
      { church_id: 10, name: 'North Church', representative: currentRepresentative },
      { church_id: 20, name: 'South Church', representative: replacement },
    ]);

    getRepresentatives.mockReturnValue(NEVER);
    component.openAssignment(component.assignments()[0]);
    component.selectedRepresentativeId.set(replacement.user_id);
    fixture.detectChanges();

    expect(component.preview()?.moves).toEqual([
      { representative: 'Noah Pastor', from: 'South Church', to: 'North Church', action: 'Transfer' },
      { representative: 'Amina Leader', from: 'North Church', to: null, action: 'Made inactive' },
    ]);
    expect(fixture.nativeElement.textContent).toContain('Status');
    expect(fixture.nativeElement.textContent).toContain('Inactive');
    const swalFire = vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
    });
    await component.submitAssignment();

    expect(swalFire).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Noah Pastor will move from South Church to North Church, and Amina Leader will be made inactive, leaving South Church without a representative.',
    }));
    await vi.waitFor(() => expect(swalFire).toHaveBeenCalledTimes(3));
    expect(swalFire.mock.calls[1][0]).toMatchObject({
      title: 'Representative assigned',
      text: 'Noah Pastor is now assigned to North Church.',
    });
    expect(swalFire.mock.calls[2][0]).toMatchObject({
      title: 'Previous representative made inactive',
      text: 'Amina Leader is now inactive and unassigned from North Church.',
    });
    expect(component.transferTarget()).toBeNull();
    expect(transferRepresentatives).toHaveBeenCalledWith([
      { user_id: replacement.user_id, church_id: 10 },
    ]);
    expect(component.representatives().map(({ user_id }) => user_id)).toEqual([7, replacement.user_id]);
  });
});
