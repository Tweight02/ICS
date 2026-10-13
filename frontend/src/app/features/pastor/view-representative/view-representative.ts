import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
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

    representatives = signal<Representative[]>([]);
    loading = signal(false);
    error = signal('');
    search = signal('');

    currentPage = signal(1);
    lastPage = signal(1);
    total = signal(0);

    ngOnInit(): void {
        this.loadRepresentatives();
    }

    loadRepresentatives(): void {
        this.loading.set(true);
        this.error.set('');

        const filters: RepresentativeFilters = {
            search: this.search(),
            page: this.currentPage(),
            per_page: 15
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

    clearSearch(): void {
        this.search.set('');
        this.currentPage.set(1);
        this.loadRepresentatives();
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