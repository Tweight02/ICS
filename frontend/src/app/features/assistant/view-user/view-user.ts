import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../../core/services/user/user-service';
import { Pastor } from '../../../core/models/pastor.model';
import { Church } from '../../../core/models/church.model';

@Component({
  imports: [
    TitleCasePipe,
    RouterLink
  ],
  selector: 'app-view-user',
  styleUrl: './view-user.css',
  templateUrl: './view-user.html',
})
export class ViewUser implements OnInit {

  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  private search$ = new Subject<string>();

  pastors = signal<Pastor[]>([]);
  districts = signal<Church[]>([]);

  loading = signal(false);
  savingTransfer = signal(false);

  error = signal<string | null>(null);

  search = signal('');
  churchId = signal('');

  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  from = signal(0);
  to = signal(0);

  readonly perPage = 15;

  // Bulk transfer
  bulkMode = signal(false);

  selectedPastorIds = signal<number[]>([]);

  individualDestinations = signal<
    Record<number, number | null>
  >({});

  ngOnInit() {

    this.userService.getDistricts().subscribe({
      next: (res) => {
        this.districts.set(res.data);
      },
      error: () => {
        this.error.set('Failed to load districts.');
      }
    });

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {

        this.search.set(value);
        this.page.set(1);

        this.loadPastors();
      });

    this.loadPastors();
  }

  loadPastors() {

    this.loading.set(true);
    this.error.set(null);

    this.userService
      .getPastors({
        search: this.search(),
        church_id: this.churchId(),
        page: this.page(),
        per_page: this.perPage,
      })
      .subscribe({

        next: (res) => {

          this.pastors.set(res.data);

          this.page.set(res.current_page);
          this.lastPage.set(res.last_page);
          this.total.set(res.total);

          this.from.set(res.from ?? 0);
          this.to.set(res.to ?? 0);

          this.loading.set(false);
        },

        error: () => {

          this.error.set(
            'Failed to load pastors. Please try again.'
          );

          this.loading.set(false);
        }

      });
  }

  onSearch(value: string) {

    this.search$.next(value.trim());
  }

  onDistrictChange(value: string) {

    this.churchId.set(value);

    this.page.set(1);

    this.loadPastors();
  }

  prevPage() {

    if (this.page() > 1) {

      this.page.update(
        p => p - 1
      );

      this.loadPastors();
    }
  }

  nextPage() {

    if (this.page() < this.lastPage()) {

      this.page.update(
        p => p + 1
      );

      this.loadPastors();
    }
  }

  fullName(p: Pastor) {

    return [
      p.first_name,
      p.middle_name,
      p.last_name,
      p.extension_name
    ]
      .filter(Boolean)
      .join(' ');
  }

  initials(p: Pastor) {

    return (
      (p.first_name?.[0] ?? '') +
      (p.last_name?.[0] ?? '')
    ).toUpperCase();
  }

  genderBadge(p: Pastor) {

    return p.gender === 'female'
      ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
      : 'bg-sky-50 text-sky-700 ring-sky-600/15';
  }

  // =========================================================
  // BULK TRANSFER
  // =========================================================

  enterBulkMode() {

    this.bulkMode.set(true);

    this.selectedPastorIds.set([]);

    this.individualDestinations.set({});
  }

  cancelBulkMode() {

    this.bulkMode.set(false);

    this.selectedPastorIds.set([]);

    this.individualDestinations.set({});
  }

  isSelected(userId: number): boolean {

    return this.selectedPastorIds()
      .includes(userId);
  }

  togglePastor(userId: number) {

    const selected = [
      ...this.selectedPastorIds()
    ];

    const index = selected.indexOf(userId);

    if (index === -1) {

      selected.push(userId);

    } else {

      selected.splice(index, 1);
    }

    this.selectedPastorIds.set(selected);
  }

  allVisibleSelected(): boolean {

    const visible = this.pastors();

    if (!visible.length) {
      return false;
    }

    return visible.every(
      pastor =>
        this.isSelected(pastor.user_id)
    );
  }

  toggleAllVisible() {

    const selected = [
      ...this.selectedPastorIds()
    ];

    if (this.allVisibleSelected()) {

      this.pastors().forEach(pastor => {

        const index =
          selected.indexOf(pastor.user_id);

        if (index !== -1) {

          selected.splice(index, 1);
        }
      });

    } else {

      this.pastors().forEach(pastor => {

        if (!selected.includes(pastor.user_id)) {

          selected.push(pastor.user_id);
        }
      });
    }

    this.selectedPastorIds.set(selected);
  }

  selectedCount(): number {

    return this.selectedPastorIds().length;
  }

  updateIndividualDestination(
    userId: number,
    value: string
  ) {

    const destinations = {
      ...this.individualDestinations()
    };

    destinations[userId] =
      value ? Number(value) : null;

    this.individualDestinations.set(
      destinations
    );
  }

  getIndividualDestination(
    userId: number
  ): number | null {

    return this.individualDestinations()
      [userId] ?? null;
  }

  // =========================================================
  // VALIDATION
  // =========================================================

  validateTransfer(): string | null {

    const selected =
      this.selectedPastorIds();

    if (selected.length === 0) {

      return 'Please select at least one pastor.';
    }

    const destinations =
      selected.map(userId =>
        this.getIndividualDestination(userId)
      );

    // Every pastor must have a destination
    if (
      destinations.some(
        destination => destination === null
      )
    ) {

      return 'Please assign a destination district to every selected pastor.';
    }

    const destinationIds =
      destinations as number[];

    // A destination can only be used once
    const uniqueDestinations =
      new Set(destinationIds);

    if (
      uniqueDestinations.size !==
      destinationIds.length
    ) {

      return 'Each pastor must have a different destination district.';
    }

    // Pastor cannot transfer to same district
    for (const userId of selected) {

      const pastor =
        this.pastors().find(
          p => p.user_id === userId
        );

      const destination =
        this.getIndividualDestination(userId);

      if (!pastor || destination === null) {
        continue;
      }

      if (
        Number(destination) ===
        Number(pastor.church_id)
      ) {

        return `${this.fullName(pastor)} is already assigned to this district.`;
      }
    }

    return null;
  }

  buildTransfers() {

    return this.selectedPastorIds().map(
      userId => ({
        user_id: userId,
        church_id:
          this.getIndividualDestination(
            userId
          )!
      })
    );
  }

  // =========================================================
  // REVIEW
  // =========================================================

  async reviewTransfers() {

    const validation =
      this.validateTransfer();

    if (validation) {

      await Swal.fire({
        icon: 'warning',
        title: 'Invalid transfer',
        text: validation,
        confirmButtonColor: '#0F4A30'
      });

      return;
    }

    const transfers =
      this.buildTransfers();

    const rows = transfers
      .map(transfer => {

        const pastor =
          this.pastors().find(
            p =>
              p.user_id ===
              transfer.user_id
          );

        const destination =
          this.districts().find(
            d =>
              Number(d.church_id) ===
              Number(transfer.church_id)
          );

        if (!pastor) {
          return '';
        }

        return `
          <div class="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-left">
            <div>
              <div class="font-medium text-slate-900">
                ${this.fullName(pastor)}
              </div>

              <div class="text-xs text-slate-500">
                ${pastor.church?.name ?? 'Current district'}
              </div>
            </div>

            <div class="text-right">
              <div class="text-xs text-slate-400">
                Transfer to
              </div>

              <div class="font-medium text-[#0F4A30]">
                ${destination?.name ?? 'Unknown district'}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const result =
      await Swal.fire({

        title: 'Review Transfers',

        html: `
          <div class="max-h-80 overflow-y-auto">
            ${rows}
          </div>
        `,

        showCancelButton: true,

        confirmButtonText:
          'Confirm Transfers',

        cancelButtonText:
          'Cancel',

        confirmButtonColor:
          '#0F4A30',

        cancelButtonColor:
          '#64748b',

        width: 650
      });

    if (result.isConfirmed) {

      this.executeTransfers();
    }
  }

  // =========================================================
  // EXECUTE
  // =========================================================

  executeTransfers() {

    const validation =
      this.validateTransfer();

    if (validation) {

      Swal.fire({
        icon: 'warning',
        title: 'Invalid transfer',
        text: validation,
        confirmButtonColor: '#0F4A30'
      });

      return;
    }

    const transfers =
      this.buildTransfers();

    this.savingTransfer.set(true);

    this.userService
      .bulkTransfer(transfers)
      .subscribe({

        next: async (res) => {

          this.savingTransfer.set(false);

          await Swal.fire({
            icon: 'success',
            title: 'Transfer Complete',
            text: res.message,
            confirmButtonColor: '#0F4A30'
          });

          this.cancelBulkMode();

          this.loadPastors();
        },

        error: async (err) => {

          this.savingTransfer.set(false);

          const message =
            err?.error?.message ??
            err?.error?.errors?.transfers?.[0] ??
            'The pastor transfers could not be completed.';

          await Swal.fire({
            icon: 'error',
            title: 'Transfer Failed',
            text: message,
            confirmButtonColor: '#0F4A30'
          });
        }
      });
  }
}