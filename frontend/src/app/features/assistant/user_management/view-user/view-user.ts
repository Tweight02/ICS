import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { UserService } from '../../../../core/services/user/user-service';
import { Pastor } from '../../../../core/models/pastor.model';
import { Church } from '../../../../core/models/church.model';

@Component({
  selector: 'app-view-user',
  standalone: true,
  imports: [DatePipe, RouterLink],
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

  error = signal<string | null>(null);

  search = signal('');
  churchId = signal('');
  status = signal<'active' | 'inactive' | ''>('');

  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  from = signal(0);
  to = signal(0);

  readonly perPage = 10;

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
        status: this.status(),
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

  onStatusChange(value: 'active' | 'inactive' | ''): void {
    this.status.set(value);
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
}
