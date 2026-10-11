import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService } from '../../../core/services/user/user-service'; // adjust the path
import { Pastor } from '../../../core/models/pastor.model';
import { Church } from '../../../core/models/church.model';
import { Department } from '../../../core/models/department.model';

@Component({
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  selector: 'app-edit-user',
  styleUrl: './edit-user.css',
  templateUrl: './edit-user.html',
})
export class EditUser implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);

  readonly backUrl = '/assistant/view-user'; // full path to your list page; adjust to match your route prefix
  private id = this.route.snapshot.paramMap.get('id')!;

  pastor = signal<Pastor | null>(null);
  departments = signal<Department[]>([]);
  districts = signal<Church[]>([]);

  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  submitErrors = signal<string[]>([]);

  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    middle_name: [''],
    last_name: ['', Validators.required],
    extension_name: [''],
    birthdate: ['', Validators.required],
    gender: ['', Validators.required],
    department_id: ['', Validators.required],
    church_id: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.minLength(8)], // optional: blank keeps the current password
  });

  ngOnInit() {
    forkJoin({
      departments: this.userService.getDepartments(),
      districts: this.userService.getDistricts(),
      pastor: this.userService.getPastor(this.id),
    }).subscribe({
      next: ({ departments, districts, pastor }) => {
        const p = pastor.data;

        this.departments.set(departments.data);
        this.districts.set(districts.data);
        this.pastor.set(p);

        this.form.patchValue({
          first_name: p.first_name,
          middle_name: p.middle_name ?? '',
          last_name: p.last_name,
          extension_name: p.extension_name ?? '',
          birthdate: p.birthdate?.slice(0, 10) ?? '', // <input type="date"> needs yyyy-MM-dd
          gender: p.gender,
          department_id: String(p.department_id),
          church_id: String(p.church_id),
          email: p.email,
          password: '',
        });

        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load this user. Please try again.');
        this.loading.set(false);
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Record<string, unknown> = { ...this.form.getRawValue() };
    if (!payload['password']) {
      delete payload['password']; // don't send a blank password
    }

    this.saving.set(true);
    this.submitErrors.set([]);

    this.userService.updatePastor(this.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigateByUrl(this.backUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const errors = err.error?.errors as Record<string, string[]> | undefined;
        this.submitErrors.set(
          errors ? Object.values(errors).flat() : [err.error?.message ?? 'Something went wrong.'],
        );
      },
    });
  }

  initials(p: Pastor) {
    return ((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase();
  }

  age(birthdate: string) {
    const born = new Date(birthdate);
    const today = new Date();
    let years = today.getFullYear() - born.getFullYear();
    const m = today.getMonth() - born.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < born.getDate())) {
      years--;
    }
    return years;
  }
}