import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../../core/services/user/user-service';
import { Pastor } from '../../../core/models/pastor.model';
import { Church } from '../../../core/models/church.model';

@Component({
  selector: 'app-view-user',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './view-user.html',
  styleUrl: './view-user.css',
})
export class ViewUser implements OnInit {
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

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

  readonly perPage = 10;

  // Bulk transfer
  bulkMode = signal(false);
  selectedPastorIds = signal<number[]>([]);

  individualDestinations = signal<Record<number, number | null>>({});

  ngOnInit(): void {
    this.userService.getDistricts().subscribe({
      next: (res) => {
        this.districts.set(res.data);
      },
      error: () => {
        this.error.set('Failed to load districts.');
      },
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

  // =========================================================
  // VIEW PASTOR
  // =========================================================

  viewPastor(pastor: Pastor): void {
    if (this.bulkMode()) {
      return;
    }

    this.router.navigate(['/assistant/edit-user', pastor.user_id]);
  }

  onRowSpace(event: KeyboardEvent, pastor: Pastor): void {
    event.preventDefault();
    this.viewPastor(pastor);
  }

  // =========================================================
  // LOAD PASTORS
  // =========================================================

  loadPastors(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService
      .getPastors({
        search: this.search(),
        church_id: this.churchId(),
        page: this.page(),
        per_page: this.perPage,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
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
          this.error.set('Failed to load pastors. Please try again.');
          this.loading.set(false);
        },
      });
  }

  onSearch(value: string): void {
    this.search$.next(value.trim());
  }

  onDistrictChange(value: string): void {
    this.churchId.set(value);
    this.page.set(1);
    this.loadPastors();
  }

  // =========================================================
  // PAGINATION
  // =========================================================

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadPastors();
    }
  }

  nextPage(): void {
    if (this.page() < this.lastPage()) {
      this.page.update((p) => p + 1);
      this.loadPastors();
    }
  }

  // =========================================================
  // PASTOR DISPLAY HELPERS
  // =========================================================

  fullName(p: Pastor): string {
    return [
      p.first_name,
      p.middle_name,
      p.last_name,
      p.extension_name,
    ]
      .filter(Boolean)
      .join(' ');
  }

  initials(p: Pastor): string {
    return (
      (p.first_name?.[0] ?? '') +
      (p.last_name?.[0] ?? '')
    ).toUpperCase();
  }

  genderBadge(p: Pastor): string {
    return p.gender === 'female'
      ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
      : 'bg-sky-50 text-sky-700 ring-sky-600/15';
  }

  // =========================================================
  // BULK TRANSFER MODE
  // =========================================================

  enterBulkMode(): void {
    this.bulkMode.set(true);
    this.selectedPastorIds.set([]);
    this.individualDestinations.set({});
  }

  cancelBulkMode(): void {
    this.bulkMode.set(false);
    this.selectedPastorIds.set([]);
    this.individualDestinations.set({});
  }

  isSelected(userId: number): boolean {
    return this.selectedPastorIds().includes(userId);
  }

  togglePastor(userId: number): void {
    const selected = [...this.selectedPastorIds()];
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

    return visible.every((pastor) =>
      this.isSelected(pastor.user_id)
    );
  }

  toggleAllVisible(): void {
    const selected = [...this.selectedPastorIds()];

    if (this.allVisibleSelected()) {
      this.pastors().forEach((pastor) => {
        const index = selected.indexOf(pastor.user_id);

        if (index !== -1) {
          selected.splice(index, 1);
        }
      });
    } else {
      this.pastors().forEach((pastor) => {
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
  ): void {
    const destinations = {
      ...this.individualDestinations(),
    };

    destinations[userId] = value ? Number(value) : null;

    this.individualDestinations.set(destinations);
  }

  getIndividualDestination(userId: number): number | null {
    return this.individualDestinations()[userId] ?? null;
  }

  // =========================================================
  // TRANSFER VALIDATION
  // =========================================================

  validateTransfer(): string | null {
    const selected = this.selectedPastorIds();

    if (selected.length === 0) {
      return 'Please select at least one pastor.';
    }

    const destinations = selected.map((userId) =>
      this.getIndividualDestination(userId)
    );

    if (destinations.some((destination) => destination === null)) {
      return 'Please assign a destination district to every selected pastor.';
    }

    const destinationIds = destinations as number[];
    const uniqueDestinations = new Set(destinationIds);

    if (uniqueDestinations.size !== destinationIds.length) {
      return 'Each pastor must have a different destination district.';
    }

    for (const userId of selected) {
      const pastor = this.pastors().find(
        (p) => p.user_id === userId
      );

      const destination = this.getIndividualDestination(userId);

      if (!pastor || destination === null) {
        continue;
      }

      if (Number(destination) === Number(pastor.church_id)) {
        return `${this.fullName(pastor)} is already assigned to this district.`;
      }
    }

    return null;
  }

  buildTransfers(): { user_id: number; church_id: number }[] {
    return this.selectedPastorIds().map((userId) => ({
      user_id: userId,
      church_id: this.getIndividualDestination(userId)!,
    }));
  }

  // =========================================================
  // REVIEW TRANSFERS
  // =========================================================

  async reviewTransfers(): Promise<void> {
    if (this.savingTransfer()) {
      return;
    }

    const validation = this.validateTransfer();

    if (validation) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid transfer',
        text: validation,
        confirmButtonColor: '#0F4A30',
      });

      return;
    }

    const transfers = this.buildTransfers();

    const rows = transfers
      .map((transfer) => {
        const pastor = this.pastors().find(
          (p) => p.user_id === transfer.user_id
        );

        const destination = this.districts().find(
          (d) => Number(d.church_id) === Number(transfer.church_id)
        );

        if (!pastor) {
          return '';
        }

        return `
          <div class="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-left">
            <div>
              <div class="font-medium text-slate-900">
                ${this.escapeHtml(this.fullName(pastor))}
              </div>
              <div class="text-xs text-slate-500">
                ${this.escapeHtml(pastor.church?.name ?? 'Current district')}
              </div>
            </div>

            <div class="text-right">
              <div class="text-xs text-slate-400">
                Transfer to
              </div>
              <div class="font-medium text-[#0F4A30]">
                ${this.escapeHtml(destination?.name ?? 'Unknown district')}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const result = await Swal.fire({
      title: 'Review Transfers',
      html: `<div class="max-h-80 overflow-y-auto">${rows}</div>`,
      showCancelButton: true,
      confirmButtonText: 'Confirm Transfers',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0F4A30',
      cancelButtonColor: '#64748b',
      width: 650,
    });

    if (result.isConfirmed) {
      this.executeTransfers();
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };

      return entities[char];
    });
  }

  // =========================================================
  // EXECUTE TRANSFERS
  // =========================================================

  executeTransfers(): void {
    if (this.savingTransfer()) {
      return;
    }

    const validation = this.validateTransfer();

    if (validation) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid transfer',
        text: validation,
        confirmButtonColor: '#0F4A30',
      });

      return;
    }

    const transfers = this.buildTransfers();

    this.savingTransfer.set(true);

    this.userService
      .bulkTransfer(transfers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (res) => {
          this.savingTransfer.set(false);

          await Swal.fire({
            icon: 'success',
            title: 'Transfer Complete',
            text: res.message,
            confirmButtonColor: '#0F4A30',
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
            confirmButtonColor: '#0F4A30',
          });
        },
      });
  }
}
