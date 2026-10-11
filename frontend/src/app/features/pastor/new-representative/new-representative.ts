import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { RepresentativeService } from '../../../core/services/representative/representative-service'; // adjust path

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-new-representative',
  styleUrl: './new-representative.css',
  templateUrl: './new-representative.html',
})
export class NewRepresentative implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(RepresentativeService);
  private router = inject(Router);

  churches = signal<{ church_id: number; name: string }[]>([]);
  loadingChurches = signal(true);
  saving = signal(false);
  errors = signal<string[]>([]);

  today = new Date().toISOString().slice(0, 10);

  form = this.fb.nonNullable.group({
    church_id: [0, [Validators.required, Validators.min(1)]],
    first_name: ['', Validators.required],
    middle_name: [''],
    last_name: ['', Validators.required],
    extension_name: [''],
    birthdate: ['', Validators.required],
    gender: ['male', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit() {
    this.svc.getAvailableChurches().subscribe({
      next: r => {
        this.churches.set(r.data);
        this.loadingChurches.set(false);
      },
      error: () => {
        this.loadingChurches.set(false);
        this.errors.set(['Could not load churches.']);
      },
    });
  }

  invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errors.set([]);

    this.svc.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/pastor/view-representatives']);
      },
      error: err => {
        this.saving.set(false);
        const e = err.error?.errors;
        this.errors.set(
          e ? Object.values<string[]>(e).flat() : [err.error?.message ?? 'Something went wrong.']
        );
      },
    });
  }
}