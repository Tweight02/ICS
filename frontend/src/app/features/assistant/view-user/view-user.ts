import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { UserService } from '../../../core/services/user/user-service'; // adjust the path
import { Pastor } from '../../../core/models/pastor.model';
import { Church } from '../../../core/models/church.model';
import { RouterLink } from '@angular/router';

@Component({
  imports: [DatePipe, TitleCasePipe, RouterLink],
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
  error = signal<string | null>(null);

  search = signal('');
  churchId = signal('');

  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  from = signal(0);
  to = signal(0);
  readonly perPage = 15;

  ngOnInit() {
    this.userService.getDistricts().subscribe({
      next: (res) => this.districts.set(res.data),
    });

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
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
          this.error.set('Failed to load users. Please try again.');
          this.loading.set(false);
        },
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
      this.page.update((p) => p - 1);
      this.loadPastors();
    }
  }

  nextPage() {
    if (this.page() < this.lastPage()) {
      this.page.update((p) => p + 1);
      this.loadPastors();
    }
  }

  fullName(p: Pastor) {
    return [p.first_name, p.middle_name, p.last_name, p.extension_name]
      .filter(Boolean)
      .join(' ');
  }

  initials(p: Pastor) {
    return ((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase();
  }

  genderBadge(p: Pastor) {
    return p.gender === 'female'
      ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
      : 'bg-sky-50 text-sky-700 ring-sky-600/15';
  }
}