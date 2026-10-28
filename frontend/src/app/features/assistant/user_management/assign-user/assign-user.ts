import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { AssignablePastor, DistrictPastorAssignment } from '../../../../core/models/pastor.model';
import { UserService } from '../../../../core/services/user/user-service';
import { Button } from '../../../../shared/components/button/button';

interface FilterOption {
  value: string;
  label: string;
}

interface TransferMove {
  pastor: string;
  from: string | null;
  to: string | null;
}

interface TransferPreview {
  title: string;
  moves: TransferMove[];
  note: string | null;
}

@Component({
  imports: [RouterLink, Button],
  selector: 'app-assign-user',

  templateUrl: './assign-user.html',
})
export class AssignUser implements OnInit {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly brandColor = '#0F4A30';

  assignments = signal<DistrictPastorAssignment[]>([]);
  pastors = signal<AssignablePastor[]>([]);
  vacantDistricts = computed(() => this.assignments().filter((assignment) => assignment.pastor_user_id === null));
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');

  // ---------- District filter (dropdown that always opens downward) ----------
  readonly selectedDistrictId = signal(''); // '' = all districts
  readonly filterOpen = signal(false);
  readonly filterQuery = signal('');
  readonly activeIndex = signal(0);

  readonly districtOptions = computed<FilterOption[]>(() => [
    { value: '', label: 'All districts' },
    ...this.assignments().map((a) => ({ value: String(a.church_id), label: a.district_name })),
  ]);

  readonly filteredDistrictOptions = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const all = this.districtOptions();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  });

  readonly selectedDistrictLabel = computed(
    () => this.districtOptions().find((o) => o.value === this.selectedDistrictId())?.label ?? 'All districts'
  );

  /** Cards shown in "Current assignments" after applying the district filter. */
  readonly visibleAssignments = computed(() => {
    const id = this.selectedDistrictId();
    return id ? this.assignments().filter((a) => String(a.church_id) === id) : this.assignments();
  });

  // ---------- Transfer modal ----------
  readonly transferTarget = signal<DistrictPastorAssignment | null>(null); // the district card that was selected
  readonly selectedPastorId = signal<number | null>(null);
  readonly pastorQuery = signal('');
  private modalOpener: HTMLElement | null = null;

  /** user_id -> the district that pastor currently serves (derived from the assignments list). */
  readonly pastorDistricts = computed(() => {
    const map = new Map<number, DistrictPastorAssignment>();
    for (const a of this.assignments()) {
      if (a.pastor_user_id !== null) {
        map.set(a.pastor_user_id, a);
      }
    }
    return map;
  });

  readonly filteredPastors = computed(() => {
    const q = this.pastorQuery().trim().toLowerCase();
    const all = this.pastors();
    return q ? all.filter((p) => p.full_name.toLowerCase().includes(q)) : all;
  });

  readonly selectedPastor = computed(
    () => this.pastors().find((p) => p.user_id === this.selectedPastorId()) ?? null
  );

  /** The selected pastor's current district (null if they are unassigned). */
  readonly selectedPastorFrom = computed(() => {
    const pastor = this.selectedPastor();
    return pastor ? (this.pastorDistricts().get(pastor.user_id) ?? null) : null;
  });

  /** Balanced before/after summary: one entry per pastor affected by the change. */
  readonly preview = computed<TransferPreview | null>(() => {
    const target = this.transferTarget();
    const pastor = this.selectedPastor();
    if (!target || !pastor) {
      return null;
    }

    const from = this.selectedPastorFrom();
    const hasOccupant = target.pastor_user_id !== null;

    const moves: TransferMove[] = [
      { pastor: pastor.full_name, from: from?.district_name ?? null, to: target.district_name },
    ];

    if (hasOccupant) {
      moves.push({
        pastor: target.pastor_name ?? 'Current pastor',
        from: target.district_name,
        to: from?.district_name ?? null, // swaps into the other pastor's district, or becomes unassigned
      });
    }

    let title: string;
    let note: string | null = null;
    if (hasOccupant && from) {
      title = 'These two pastors will swap districts';
    } else if (hasOccupant) {
      title = 'Replace pastor';
    } else if (from) {
      title = 'Transfer pastor';
      note = `${from.district_name} will have no pastor after this transfer.`;
    } else {
      title = 'Assign pastor';
    }

    return { title, moves, note };
  });


  constructor() {
    // Never leave the page scroll-locked if the component is destroyed while the modal is open.
    this.destroyRef.onDestroy(() => document.body.classList.remove('overflow-hidden'));
  }

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.userService.getDistrictPastorAssignments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.assignments.set(response.assignments);
          this.pastors.set(response.pastors);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Unable to load district assignments. Please try again.');
          this.loading.set(false);
        },
      });
  }

  // ---------- Filter dropdown ----------

  toggleFilter(): void {
    if (this.filterOpen()) {
      this.closeFilter();
      return;
    }
    this.filterOpen.set(true);
    this.filterQuery.set('');
    const idx = this.filteredDistrictOptions().findIndex((o) => o.value === this.selectedDistrictId());
    this.activeIndex.set(Math.max(idx, 0));
    setTimeout(() => document.getElementById('district-filter-search')?.focus());
  }

  closeFilter(): void {
    this.filterOpen.set(false);
    this.filterQuery.set('');
  }

  selectDistrictFilter(option: FilterOption): void {
    this.selectedDistrictId.set(option.value);
    this.closeFilter();
    document.getElementById('district-filter')?.focus();
  }

  clearFilter(): void {
    this.selectedDistrictId.set('');
  }

  onFilterInput(value: string): void {
    this.filterQuery.set(value);
    this.activeIndex.set(0);
  }

  /** Close when focus leaves the whole dropdown (trigger + panel). */
  onFilterFocusOut(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (!host.contains(event.relatedTarget as Node | null)) {
      this.closeFilter();
    }
  }

  onFilterTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && !this.filterOpen()) {
      event.preventDefault();
      this.toggleFilter();
    }
  }

  onFilterKeydown(event: KeyboardEvent): void {
    const options = this.filteredDistrictOptions();
    const count = options.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.set(count ? (this.activeIndex() + 1) % count : 0);
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set(count ? (this.activeIndex() - 1 + count) % count : 0);
        this.scrollActiveIntoView();
        break;
      case 'Enter':
        event.preventDefault();
        if (count) {
          this.selectDistrictFilter(options[this.activeIndex()]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeFilter();
        document.getElementById('district-filter')?.focus();
        break;
    }
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() =>
      document.getElementById(`district-filter-opt-${this.activeIndex()}`)?.scrollIntoView({ block: 'nearest' })
    );
  }

  // ---------- Transfer modal ----------

  /** Opens for any district: vacant (assign a pastor) or occupied (change its pastor). */
  openTransfer(assignment: DistrictPastorAssignment): void {
    if (this.saving()) {
      return;
    }
    this.modalOpener = document.activeElement as HTMLElement | null;
    this.selectedPastorId.set(null);
    this.pastorQuery.set('');
    this.transferTarget.set(assignment);
    document.body.classList.add('overflow-hidden');
    setTimeout(() => document.getElementById('pastor-search')?.focus());
  }

  closeTransfer(): void {
    if (this.saving()) {
      return;
    }
    this.transferTarget.set(null);
    this.selectedPastorId.set(null);
    this.pastorQuery.set('');
    document.body.classList.remove('overflow-hidden');
    this.modalOpener?.focus();
    this.modalOpener = null;
  }

  selectPastor(pastor: AssignablePastor): void {
    this.selectedPastorId.set(pastor.user_id);
  }

  clearPastor(): void {
    if (this.saving()) {
      return;
    }
    this.selectedPastorId.set(null);
    setTimeout(() => document.getElementById('pastor-search')?.focus());
  }

  onPastorSearch(value: string): void {
    this.pastorQuery.set(value);
  }

  /** Escape closes the modal; Tab stays inside it. */
  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeTransfer();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const dialog = document.getElementById('transfer-dialog');
    const focusable = dialog
      ? Array.from(
          dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href]')
        )
      : [];
    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async submitTransfer(): Promise<void> {
    const target = this.transferTarget();
    const pastor = this.selectedPastor();
    if (!target || !pastor || this.saving()) {
      return;
    }

    if (target.pastor_user_id === pastor.user_id) {
      this.notifyError('Already assigned', `${pastor.full_name} is already the pastor of ${target.district_name}.`);
      return;
    }

    const from = this.selectedPastorFrom();
    const isChange = target.pastor_user_id !== null; // the target district already has a pastor
    const replaced = isChange ? target.pastor_name : null;

    const confirmationText = replaced && from
      ? `${pastor.full_name} will move from ${from.district_name} to ${target.district_name}, and ${replaced} will move to ${from.district_name}.`
      : replaced
        ? `${pastor.full_name} will replace ${replaced} in ${target.district_name}; ${replaced} will be unassigned.`
        : from
          ? `${pastor.full_name} will move from ${from.district_name} to ${target.district_name}, leaving ${from.district_name} without a pastor.`
          : `${pastor.full_name} will be assigned to ${target.district_name}.`;

    this.saving.set(true);
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: 'Confirm pastor transfer',
      text: confirmationText,
      showCancelButton: true,
      reverseButtons: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Approve transfer',
      confirmButtonColor: this.brandColor,
    });
    if (!confirmation.isConfirmed) {
      this.saving.set(false);
      return;
    }

    this.userService.assignPastorToDistrict(target.church_id, pastor.user_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeTransfer();
          this.loadAssignments();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: isChange ? 'Pastor changed' : from ? 'Pastor transferred' : 'Pastor assigned',
            text: this.successText(pastor.full_name, target.district_name, from?.district_name ?? null, replaced),
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.notifyError(
            isChange ? 'Change failed' : from ? 'Transfer failed' : 'Assignment failed',
            error.error?.errors?.district_id?.[0]
              ?? error.error?.errors?.user_id?.[0]
              ?? error.error?.message
              ?? 'The assignment could not be saved. Please try again.'
          );
        },
      });
  }

  private successText(pastor: string, to: string, from: string | null, replaced: string | null): string {
    if (replaced) {
      return from
        ? `${pastor} moved to ${to}, and ${replaced} moved to ${from}.`
        : `${pastor} now serves ${to}, replacing ${replaced}.`;
    }
    return from ? `${pastor} moved from ${from} to ${to}.` : `${pastor} is now assigned to ${to}.`;
  }

  private notifyError(title: string, text: string): void {
    Swal.fire({ icon: 'error', title, text, confirmButtonColor: this.brandColor });
  }
}