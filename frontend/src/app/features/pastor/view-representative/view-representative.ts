import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

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

    representatives: Representative[] = [];
    loading = false;
    error = '';
    search = '';

    currentPage = 1;
    lastPage = 1;
    total = 0;

    ngOnInit(): void {
        this.loadRepresentatives();
    }

    loadRepresentatives(): void {
        this.loading = true;
        this.error = '';

        const filters: RepresentativeFilters = {
            search: this.search,
            page: this.currentPage,
            per_page: 15
        };

        this.rep.getRepresentatives(filters)
            .pipe(
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: (response) => {
                    this.representatives = response.data ?? [];
                    this.currentPage = response.current_page ?? 1;
                    this.lastPage = response.last_page ?? 1;
                    this.total = response.total ?? this.representatives.length;
                },
                error: (err) => {
                    console.error('Failed to load representatives:', err);

                    this.error =
                        err?.error?.message ??
                        'Unable to load representatives. Please try again.';
                }
            });
    }

    searchRepresentatives(): void {
        this.currentPage = 1;
        this.loadRepresentatives();
    }

    clearSearch(): void {
        this.search = '';
        this.currentPage = 1;
        this.loadRepresentatives();
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadRepresentatives();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.lastPage) {
            this.currentPage++;
            this.loadRepresentatives();
        }
    }
}