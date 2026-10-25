import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, expand, finalize, forkJoin, reduce } from 'rxjs';
import Swal from 'sweetalert2';

import { Representative } from '../../../../core/models/representative.model';
import { ChurchService } from '../../../../core/services/church/church-service';
import { RepresentativeService, PaginatedRepresentatives } from '../../../../core/services/representative/representative-service';

interface ChurchAssignment {
  church_id: number;
  name: string;
  representative: Representative | null;
}

interface ChurchFilterOption {
  value: string;
  label: string;
}

interface RepresentativeMove {
  representative: string;
  from: string | null;
  to: string | null;
}

interface AssignmentPreview {
  title: string;
  moves: RepresentativeMove[];
  note: string | null;
}

@Component({
  imports: [RouterLink],
  selector: 'app-assign-church',
  styleUrl: './assign-church.css',
  templateUrl: './assign-church.html',
})
export class AssignChurch implements OnInit {
  private readonly representativeService = inject(RepresentativeService);
  private readonly churchService = inject(ChurchService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly brandColor = '#0F4A30';
  private readonly perPage = 100;

  assignments = signal<ChurchAssignment[]>([]);
  representatives = signal<Representative[]>([]);
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');

  readonly selectedChurchId = signal('');
  readonly filterOpen = signal(false);
  readonly filterQuery = signal('');
  readonly activeIndex = signal(0);

  readonly vacantChurches = computed(() =>
    this.assignments().filter((assignment) => assignment.representative === null)
  );

  readonly churchOptions = computed<ChurchFilterOption[]>(() => [
    { value: '', label: 'All churches' },
    ...this.assignments().map((assignment) => ({
      value: String(assignment.church_id),
      label: assignment.name,
    })),
  ]);

  readonly filteredChurchOptions = computed(() => {
    const query = this.filterQuery().trim().toLowerCase();
    const options = this.churchOptions();
    return query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;
  });

  readonly selectedChurchLabel = computed(
    () => this.churchOptions().find((option) => option.value === this.selectedChurchId())?.label ?? 'All churches'
  );

  readonly visibleAssignments = computed(() => {
    const id = this.selectedChurchId();
    return id
      ? this.assignments().filter((assignment) => String(assignment.church_id) === id)
      : this.assignments();
  });

  readonly transferTarget = signal<ChurchAssignment | null>(null);
  readonly selectedRepresentativeId = signal<number | null>(null);
  readonly representativeQuery = signal('');
  private modalOpener: HTMLElement | null = null;
  
  readonly filteredRepresentatives = computed(() => {
    const query = this.representativeQuery().trim().toLowerCase();
    const candidates = this.representatives();
    return query
      ? candidates.filter((representative) => this.fullName(representative).toLowerCase().includes(query))
      : candidates;
  });

  readonly selectedRepresentative = computed(
    () => this.representatives().find((representative) => representative.user_id === this.selectedRepresentativeId()) ?? null
  );

  readonly selectedRepresentativeFrom = computed(() => {
    const representative = this.selectedRepresentative();
    if (!representative) {
      return null;
    }
    return this.assignments().find((assignment) => assignment.church_id === representative.church_id) ?? null;
  });

  readonly canSubmitAssignment = computed(() => {
    const target = this.transferTarget();
    return !!this.selectedRepresentative() && (!target?.representative || !!this.selectedRepresentativeFrom());
  });

  readonly preview = computed<AssignmentPreview | null>(() => {
    const target = this.transferTarget();
    const representative = this.selectedRepresentative();
    if (!target || !representative) {
      return null;
    }

    const from = this.selectedRepresentativeFrom();
    if (target.representative && !from) {
      return null;
    }

    const moves: RepresentativeMove[] = [
      { representative: this.fullName(representative), from: from?.name ?? null, to: target.name },
    ];

    if (target.representative) {
      moves.push({
        representative: this.fullName(target.representative),
        from: target.name,
        to: from?.name ?? null,
      });
      return { title: 'Swap representatives', moves, note: null };
    }

    return {
      title: from ? 'Transfer representative' : 'Assign representative',
      moves,
      note: from ? `${from.name} will have no representative after this transfer.` : null,
    };
  });

  constructor() {
    this.destroyRef.onDestroy(() => document.body.classList.remove('overflow-hidden'));
  }

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.loadError.set('');

    forkJoin({
      churches: this.churchService.getMyDistrictChurches(),
      representatives: this.loadActiveRepresentatives(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ churches, representatives }) => {
          this.representatives.set(representatives);
          this.assignments.set((churches.data ?? []).map((church) => ({
            church_id: church.church_id,
            name: church.name,
            representative: representatives.find((representative) =>
              representative.church_id === church.church_id
            ) ?? null,
          })));
        },
        error: (error) => {
          console.error('Failed to load church assignments:', error);
          this.loadError.set(error?.error?.message ?? 'Unable to load church assignments. Please try again.');
        },
      });
  }

  private loadActiveRepresentatives() {
    const filters = { status: 'active' as const, per_page: this.perPage };
    return this.representativeService.getRepresentatives({ ...filters, page: 1 }).pipe(
      expand((response) =>
        response.current_page < response.last_page
          ? this.representativeService.getRepresentatives({ ...filters, page: response.current_page + 1 })
          : EMPTY
      ),
      reduce((all: Representative[], response: PaginatedRepresentatives) => {
        all.push(...response.data);
        return all;
      }, [])
    );
  }

  fullName(representative: Representative): string {
    return [
      representative.first_name,
      representative.middle_name,
      representative.last_name,
      representative.extension_name,
    ].filter(Boolean).join(' ');
  }

  sourceFor(representative: Representative) {
    return this.assignments().find((assignment) => assignment.church_id === representative.church_id) ?? null;
  }

  toggleFilter(): void {
    if (this.filterOpen()) {
      this.closeFilter();
      return;
    }

    this.filterOpen.set(true);
    this.filterQuery.set('');
    const index = this.filteredChurchOptions().findIndex((option) => option.value === this.selectedChurchId());
    this.activeIndex.set(Math.max(index, 0));
    setTimeout(() => document.getElementById('church-filter-search')?.focus());
  }

  closeFilter(): void {
    this.filterOpen.set(false);
    this.filterQuery.set('');
  }

  selectChurchFilter(option: ChurchFilterOption): void {
    this.selectedChurchId.set(option.value);
    this.closeFilter();
    document.getElementById('church-filter')?.focus();
  }

  clearFilter(): void {
    this.selectedChurchId.set('');
  }

  onFilterInput(value: string): void {
    this.filterQuery.set(value);
    this.activeIndex.set(0);
  }

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
    const options = this.filteredChurchOptions();
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
          this.selectChurchFilter(options[this.activeIndex()]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeFilter();
        document.getElementById('church-filter')?.focus();
        break;
    }
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() =>
      document.getElementById(`church-filter-opt-${this.activeIndex()}`)?.scrollIntoView({ block: 'nearest' })
    );
  }

  openAssignment(assignment: ChurchAssignment): void {
    if (this.saving()) {
      return;
    }

    this.modalOpener = document.activeElement as HTMLElement | null;
    this.selectedRepresentativeId.set(null);
    this.representativeQuery.set('');
    this.transferTarget.set(assignment);
    document.body.classList.add('overflow-hidden');
    setTimeout(() => document.getElementById('representative-search')?.focus());
  }

  closeAssignment(): void {
    if (this.saving()) {
      return;
    }
    this.transferTarget.set(null);
    this.selectedRepresentativeId.set(null);
    this.representativeQuery.set('');
    document.body.classList.remove('overflow-hidden');
    this.modalOpener?.focus();
    this.modalOpener = null;
  }

  onRepresentativeSearch(value: string): void {
    this.representativeQuery.set(value);
  }

  selectRepresentative(representative: Representative): void {
    if (this.saving() || representative.user_id === this.transferTarget()?.representative?.user_id) {
      return;
    }
    this.selectedRepresentativeId.set(representative.user_id);
  }

  clearRepresentative(): void {
    if (this.saving()) {
      return;
    }
    this.selectedRepresentativeId.set(null);
    setTimeout(() => document.getElementById('representative-search')?.focus());
  }

  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAssignment();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const dialog = document.getElementById('assignment-dialog');
    const focusable = dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href]'))
      : [];
    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async submitAssignment(): Promise<void> {
    const church = this.transferTarget();
    const representative = this.selectedRepresentative();
    if (!church || !representative || this.saving()) {
      return;
    }

    const transfers = [{
      user_id: representative.user_id,
      church_id: church.church_id,
    }];

    if (church.representative) {
      const sourceChurch = this.assignments().find(
        (assignment) => assignment.church_id === representative.church_id
      );
      if (!sourceChurch) {
        this.notifyError(
          'Change unavailable',
          'Choose a representative currently assigned to another church in your district to swap assignments.'
        );
        return;
      }

      transfers.push({
        user_id: church.representative.user_id,
        church_id: sourceChurch.church_id,
      });
    }

    this.saving.set(true);
    const sourceChurch = this.selectedRepresentativeFrom();
    const confirmationText = church.representative && sourceChurch
      ? `${this.fullName(representative)} will move from ${sourceChurch.name} to ${church.name}, and ${this.fullName(church.representative)} will move to ${sourceChurch.name}.`
      : sourceChurch
        ? `${this.fullName(representative)} will move from ${sourceChurch.name} to ${church.name}, leaving ${sourceChurch.name} without a representative.`
        : `${this.fullName(representative)} will be assigned to ${church.name}.`;

    const confirmation = await Swal.fire({
      icon: 'warning',
      title: 'Confirm representative transfer',
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

    this.representativeService.transferRepresentatives(transfers)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: async (response) => {
          this.saving.set(false);
          this.closeAssignment();
          await Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: church.representative ? 'Representative changed' : sourceChurch ? 'Representative transferred' : 'Representative assigned',
            text: this.successText(
              this.fullName(representative),
              church.name,
              sourceChurch?.name ?? null,
              church.representative ? this.fullName(church.representative) : null,
              response.message
            ),
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
          });
          this.loadAssignments();
        },
        error: async (error) => {
          console.error('Failed to assign representative:', error);
          this.notifyError(
            church.representative ? 'Change failed' : sourceChurch ? 'Transfer failed' : 'Assignment failed',
            error?.error?.errors?.transfers?.[0]
              ?? error?.error?.message
              ?? 'The representative could not be assigned. Please try again.'
          );
        },
      });
  }

  private successText(
    representative: string,
    to: string,
    from: string | null,
    replaced: string | null,
    responseMessage: string
  ): string {
    if (replaced && from) {
      return `${representative} moved to ${to}, and ${replaced} moved to ${from}.`;
    }
    if (replaced) {
      return responseMessage;
    }
    return from
      ? `${representative} moved from ${from} to ${to}.`
      : `${representative} is now assigned to ${to}.`;
  }

  private notifyError(title: string, text: string): void {
    Swal.fire({ icon: 'error', title, text, confirmButtonColor: this.brandColor });
  }
}
