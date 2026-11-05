import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { showAppAlert } from '../../../../shared/utils/app-alert';

import { RepresentativeService } from '../../../../core/services/representative/representative-service'; // adjust to your real path
import {
    Representative,
    RepresentativeFilters
} from '../../../../core/models/representative.model';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Button } from '../../../../shared/components/button/button';

@Component({
    selector: 'app-view-representative',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, Button],
    templateUrl: './view-representative.html',

})
export class ViewRepresentative implements OnInit {
    private rep = inject(RepresentativeService);
    private churchService = inject(ChurchService);
    private destroyRef = inject(DestroyRef);
    private search$ = new Subject<string>();

    representatives = signal<Representative[]>([]);
    loading = signal(false);
    error = signal('');
    search = signal('');
    status = signal<'active' | 'inactive' | ''>('');
    churchId = signal<number | ''>('');
    churches = signal<{ church_id: number; name: string }[]>([]);
    churchOptionsError = signal('');

    // Church filter combobox
    churchFilterOpen = signal(false);
    churchFilterQuery = signal('');
    churchFilterActiveIndex = signal(0);

    private churchFilterOptions = computed(() => [
        { value: '', label: 'All churches' },
        ...this.churches().map((c) => ({ value: String(c.church_id), label: c.name }))
    ]);

    filteredChurchFilterOptions = computed(() => {
        const q = this.churchFilterQuery().trim().toLowerCase();
        const options = this.churchFilterOptions();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    });

    selectedChurchLabel = computed(() => {
        const id = String(this.churchId());
        return this.churchFilterOptions().find((o) => o.value === id)?.label ?? 'All churches';
    });

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
                this.searchRepresentatives();
            });

        this.loadChurchOptions();

        this.loadRepresentatives();
    }

    loadChurchOptions(): void {
        this.churchOptionsError.set('');
        this.churchService.getMyDistrictChurches().subscribe({
            next: (response) => this.churches.set(response.data ?? []),
            error: (err) => {
                this.churchOptionsError.set(
                    err?.error?.message ?? 'Unable to load churches for filtering.'
                );
            }
        });
    }

    loadRepresentatives(): void {
        this.loading.set(true);
        this.error.set('');

        const filters: RepresentativeFilters = {
            search: this.search(),
            status: this.status(),
            church_id: this.churchId() || undefined,
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
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    onSearch(value: string): void {
        this.search$.next(value.trim());
    }

    onStatusChange(value: 'active' | 'inactive' | ''): void {
        this.status.set(value);
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    onChurchChange(value: string): void {
        this.churchId.set(value ? Number(value) : '');
        this.churchFilterOpen.set(false);
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    openChurchFilter(): void {
        if (this.churchFilterOpen()) {
            return;
        }

        this.churchFilterQuery.set('');
        const idx = this.filteredChurchFilterOptions()
            .findIndex((o) => o.value === String(this.churchId()));
        this.churchFilterActiveIndex.set(Math.max(idx, 0));
        this.churchFilterOpen.set(true);
    }

    onChurchFilterInput(value: string): void {
        this.churchFilterQuery.set(value);
        this.churchFilterActiveIndex.set(0);
        this.churchFilterOpen.set(true);
    }

    onChurchFilterFocusOut(event: FocusEvent): void {
        const host = event.currentTarget as HTMLElement;
        if (!host.contains(event.relatedTarget as Node | null)) {
            this.churchFilterOpen.set(false);
        }
    }

    onChurchFilterKeydown(event: KeyboardEvent): void {
        const options = this.filteredChurchFilterOptions();

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.churchFilterOpen.set(true);
                this.churchFilterActiveIndex.update((i) => Math.min(i + 1, options.length - 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.churchFilterActiveIndex.update((i) => Math.max(i - 1, 0));
                break;
            case 'Enter': {
                event.preventDefault();
                const option = options[this.churchFilterActiveIndex()];
                if (option) {
                    this.onChurchChange(option.value);
                }
                break;
            }
            case 'Escape':
                this.churchFilterOpen.set(false);
                break;
        }
    }

    clearSearch(): void {
        this.search.set('');
        this.currentPage.set(1);
        this.loadRepresentatives();
    }

    fullName(representative: Representative): string {
        return [
            representative.first_name,
            representative.middle_name,
            representative.last_name,
            representative.extension_name
        ].filter(Boolean).join(' ');
    }

    async deleteRepresentative(representative: Representative): Promise<void> {
        const name = `${representative.first_name} ${representative.last_name}`;

        const result = await showAppAlert({
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

                showAppAlert({
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
            this.currentPage.update((p) => p - 1);
            this.loadRepresentatives();
        }
    }

    nextPage(): void {
        if (this.currentPage() < this.lastPage()) {
            this.currentPage.update((p) => p + 1);
            this.loadRepresentatives();
        }
    }
}