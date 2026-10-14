import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { RepresentativeService } from '../../../core/services/representative/representative-service'; // adjust to your real path
import {
    Representative,
    RepresentativeFilters
} from '../../../core/models/representative.model';

@Component({
    selector: 'app-view-representative',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './view-representative.html',
    styleUrl: './view-representative.css'
})
export class ViewRepresentative implements OnInit {
    private rep = inject(RepresentativeService);
    private destroyRef = inject(DestroyRef);
    private search$ = new Subject<string>();

    representatives = signal<Representative[]>([]);
    loading = signal(false);
    error = signal('');
    search = signal('');
    status = signal<'active' | 'inactive' | ''>('');
    transferMode = signal(false);
    transferChurches = signal<{ church_id: number; name: string }[]>([]);
    loadingTransferChurches = signal(false);
    transferError = signal('');
    selectedRepresentativeIds = signal<number[]>([]);
    individualDestinations = signal<Record<number, number | null>>({});
    savingTransfer = signal(false);

    currentPage = signal(1);
    lastPage = signal(1);
    total = signal(0);
    from = signal(0);
    to = signal(0);

    readonly perPage = 10;

    ngOnInit(): void {
        this.search$
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((value) => {
                this.search.set(value);
                this.currentPage.set(1);
                this.loadRepresentatives();
            });

        this.loadRepresentatives();
    }

    loadRepresentatives(): void {
        this.loading.set(true);
        this.error.set('');

        const filters: RepresentativeFilters = {
            search: this.search(),
            status: this.status(),
            page: this.currentPage(),
            per_page: this.perPage
        };

        this.rep.getRepresentatives(filters)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (response) => {
                    const data = response.data ?? [];
                    this.representatives.set(data);
                    this.currentPage.set(response.current_page ?? 1);
                    this.lastPage.set(response.last_page ?? 1);
                    this.total.set(response.total ?? data.length);
                    this.from.set(response.from ?? (data.length ? (this.currentPage() - 1) * this.perPage + 1 : 0));
                    this.to.set(response.to ?? (data.length ? this.from() + data.length - 1 : 0));
                },
                error: (err) => {
                    console.error('Failed to load representatives:', err);

                    this.error.set(
                        err?.error?.message ??
                        'Unable to load representatives. Please try again.'
                    );
                }
            });
    }

    searchRepresentatives(): void {
        this.selectedRepresentativeIds.set([]);
        this.individualDestinations.set({});
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    onSearch(value: string): void {
        this.search$.next(value.trim());
    }

    onStatusChange(value: 'active' | 'inactive' | ''): void {
        this.selectedRepresentativeIds.set([]);
        this.individualDestinations.set({});
        this.status.set(value);
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    clearSearch(): void {
        this.selectedRepresentativeIds.set([]);
        this.individualDestinations.set({});
        this.search.set('');
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    enterTransferMode(): void {
        this.transferMode.set(true);
        this.selectedRepresentativeIds.set([]);
        this.individualDestinations.set({});
        this.transferError.set('');
        this.loadingTransferChurches.set(true);

        this.rep.getTransferChurches()
            .pipe(finalize(() => this.loadingTransferChurches.set(false)))
            .subscribe({
                next: (response) => this.transferChurches.set(response.data ?? []),
                error: (err) => {
                    this.transferError.set(
                        err?.error?.message ?? 'Unable to load churches for transfer.'
                    );
                }
            });
    }

    cancelTransferMode(): void {
        this.transferMode.set(false);
        this.selectedRepresentativeIds.set([]);
        this.individualDestinations.set({});
        this.transferError.set('');
    }

    isSelected(userId: number): boolean {
        return this.selectedRepresentativeIds().includes(userId);
    }

    toggleRepresentative(userId: number): void {
        const selected = this.selectedRepresentativeIds();
        this.selectedRepresentativeIds.set(
            selected.includes(userId)
                ? selected.filter((id) => id !== userId)
                : [...selected, userId]
        );
    }

    toggleAllVisible(): void {
        const selectable = this.representatives()
            .filter((representative) => representative.status === 'active')
            .map((representative) => representative.user_id);
        const selected = new Set(this.selectedRepresentativeIds());
        const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));

        for (const id of selectable) {
            if (allSelected) {
                selected.delete(id);
            } else {
                selected.add(id);
            }
        }

        this.selectedRepresentativeIds.set([...selected]);
    }

    allVisibleSelected(): boolean {
        const selectable = this.representatives()
            .filter((representative) => representative.status === 'active');

        return selectable.length > 0 && selectable.every((representative) => this.isSelected(representative.user_id));
    }

    selectedCount(): number {
        return this.selectedRepresentativeIds().length;
    }

    updateIndividualDestination(userId: number, value: string): void {
        this.individualDestinations.update((destinations) => ({
            ...destinations,
            [userId]: value ? Number(value) : null
        }));
    }

    getIndividualDestination(userId: number): number | null {
        return this.individualDestinations()[userId] ?? null;
    }

    private validateTransfer(): string | null {
        const selectedIds = this.selectedRepresentativeIds();

        if (selectedIds.length === 0) {
            return 'Select at least one representative.';
        }

        if (this.loadingTransferChurches()) {
            return 'Wait for the church list to finish loading.';
        }

        if (this.transferError()) {
            return this.transferError();
        }

        const destinations = selectedIds.map((id) => this.getIndividualDestination(id));
        if (destinations.some((destination) => destination === null)) {
            return 'Choose a destination church for every selected representative.';
        }

        if (new Set(destinations).size !== destinations.length) {
            return 'Each representative must have a different destination church.';
        }

        for (const userId of selectedIds) {
            const representative = this.representatives().find((item) => item.user_id === userId);
            const destinationId = this.getIndividualDestination(userId);

            if (!representative || destinationId === null) {
                return 'The representative list changed. Reload it and try again.';
            }

            if (Number(destinationId) === Number(representative.church_id)) {
                return `${this.fullName(representative)} is already assigned to that church.`;
            }
        }

        return null;
    }

    private buildTransfers(): { user_id: number; church_id: number }[] {
        return this.selectedRepresentativeIds().map((userId) => ({
            user_id: userId,
            church_id: this.getIndividualDestination(userId)!
        }));
    }

    async reviewTransfers(): Promise<void> {
        const validation = this.validateTransfer();
        if (validation) {
            await Swal.fire({
                icon: 'warning',
                title: 'Invalid transfer',
                text: validation,
                confirmButtonColor: '#0F4A30'
            });
            return;
        }

        const rows = this.buildTransfers().map((transfer) => {
            const representative = this.representatives().find((item) => item.user_id === transfer.user_id)!;
            const destination = this.transferChurches().find((church) => church.church_id === transfer.church_id);

            return `<div class="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-left">
                <div><div class="font-medium text-slate-900">${this.escapeHtml(this.fullName(representative))}</div>
                <div class="text-xs text-slate-500">${this.escapeHtml(representative.church?.name ?? 'Current church')}</div></div>
                <div class="text-right"><div class="text-xs text-slate-400">Transfer to</div>
                <div class="font-medium text-[#0F4A30]">${this.escapeHtml(destination?.name ?? 'Unknown church')}</div></div>
            </div>`;
        }).join('');

        const result = await Swal.fire({
            title: 'Review Transfers',
            html: `<div class="max-h-80 overflow-y-auto">${rows}</div>`,
            showCancelButton: true,
            confirmButtonText: 'Confirm Transfers',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0F4A30',
            cancelButtonColor: '#64748b',
            width: 650
        });

        if (result.isConfirmed) {
            this.executeTransfers();
        }
    }

    private escapeHtml(value: string): string {
        return value.replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character] ?? character);
    }

    private executeTransfers(): void {
        if (this.savingTransfer()) {
            return;
        }

        const validation = this.validateTransfer();
        if (validation) {
            void Swal.fire({
                icon: 'warning',
                title: 'Invalid transfer',
                text: validation,
                confirmButtonColor: '#0F4A30'
            });
            return;
        }

        this.savingTransfer.set(true);
        this.rep.transferRepresentatives(this.buildTransfers())
            .pipe(finalize(() => this.savingTransfer.set(false)))
            .subscribe({
                next: async (response) => {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Transfer Complete',
                        text: response.message,
                        confirmButtonColor: '#0F4A30'
                    });
                    this.cancelTransferMode();
                    this.loadRepresentatives();
                },
                error: async (err) => {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Transfer Failed',
                        text: err?.error?.message ?? err?.error?.errors?.transfers?.[0] ?? 'Representative transfers could not be completed.',
                        confirmButtonColor: '#0F4A30'
                    });
                }
            });
    }

    fullName(representative: Representative): string {
        return [
            representative.first_name,
            representative.middle_name,
            representative.last_name,
            representative.extension_name
        ].filter(Boolean).join(' ');
    }

    initials(representative: Representative): string {
        return (
            (representative.first_name?.[0] ?? '') +
            (representative.last_name?.[0] ?? '')
        ).toUpperCase();
    }

    async deleteRepresentative(representative: Representative): Promise<void> {
        const name = `${representative.first_name} ${representative.last_name}`;

        const result = await Swal.fire({
            title: 'Delete representative?',
            text: `${name} will be permanently removed. This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            reverseButtons: true,
            focusCancel: true
        });

        if (!result.isConfirmed) {
            return;
        }

        this.error.set('');

        // Assumes RepresentativeService has deleteRepresentative(id) - adjust to your real method name
        this.rep.deleteRepresentative(representative.user_id).subscribe({
            next: () => {
                this.representatives.update((list) =>
                    list.filter((r) => r.user_id !== representative.user_id)
                );
                this.total.update((t) => Math.max(0, t - 1));

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Representative deleted',
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true
                });
            },
            error: (err) => {
                console.error('Failed to delete representative:', err);
                this.error.set(
                    err?.error?.message ?? 'Unable to delete representative. Please try again.'
                );
            }
        });
    }

    previousPage(): void {
        if (this.currentPage() > 1) {
            this.selectedRepresentativeIds.set([]);
            this.individualDestinations.set({});
            this.currentPage.update((p) => p - 1);
            this.loadRepresentatives();
        }
    }

    nextPage(): void {
        if (this.currentPage() < this.lastPage()) {
            this.selectedRepresentativeIds.set([]);
            this.individualDestinations.set({});
            this.currentPage.update((p) => p + 1);
            this.loadRepresentatives();
        }
    }
}