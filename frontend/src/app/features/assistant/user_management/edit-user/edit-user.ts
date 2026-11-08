
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AbstractControl, ValidationErrors } from '@angular/forms';

import { UserService } from '../../../../core/services/user/user-service';
import { Button } from '../../../../shared/components/button/button';
import { Pastor } from '../../../../core/models/pastor.model';
import { Department } from '../../../../core/models/department.model';
import { showAppAlert } from '../../../../shared/utils/app-alert';


@Component({
  imports: [ReactiveFormsModule, RouterLink, Button],
  selector: 'app-edit-user',
  templateUrl: './edit-user.html',
})
export class EditUser implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);

  readonly backUrl = '/assistant/view-user';
  private id = this.route.snapshot.paramMap.get('id')!;

  pastor = signal<Pastor | null>(null);
  departments = signal<Department[]>([]);

  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  removing = signal(false);
  activating = signal(false);
  editing = signal(false);
  submitErrors = signal<string[]>([]);

  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    middle_name: [''],
    last_name: ['', Validators.required],
    extension_name: [''],
    birthdate: ['', Validators.required],
    gender: ['', Validators.required],
    department_id: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.minLength(8)],
  });


  /** Latest selectable birthdate: yesterday, in local time (backend rule is before:today). */
  readonly maxBirthdate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const notFuture = (c: AbstractControl): ValidationErrors | null =>
      c.value && c.value > this.maxBirthdate ? { beforeToday: true } : null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  
  
  ngOnInit(): void {
    // The form is read-only until Edit is selected.
    this.form.disable();


    forkJoin({
      departments: this.userService.getDepartments(),
      pastor: this.userService.getPastor(this.id),
    }).subscribe({
      next: ({ departments, pastor }) => {
        const p = pastor.data;

        this.departments.set(departments.data);
        this.pastor.set(p);

        this.form.patchValue({
          first_name: p.first_name,
          middle_name: p.middle_name ?? '',
          last_name: p.last_name,
          extension_name: p.extension_name ?? '',
          birthdate: p.birthdate?.slice(0, 10) ?? '',
          gender: p.gender,
          department_id: String(p.department_id),
          email: p.email,
          password: '',
        });

        this.form.disable();
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load this user. Please try again.');
        this.loading.set(false);
      },
    });
  }

  // Call after loading and patching the original pastor data.
  private setReadOnly(): void {
    this.form.disable({ emitEvent: false });
    this.editing.set(false);
  }

  enableEdit(): void {
    this.submitErrors.set([]);
    this.form.enable({ emitEvent: false });

    // Password should start empty when editing begins.
    this.form.get('password')?.reset('', { emitEvent: false });

    this.editing.set(true);
  }

  cancelEdit(): void {
    const p = this.pastor();

    if (!p) return;

    this.form.reset(
      {
        first_name: p.first_name ?? '',
        middle_name: p.middle_name ?? '',
        last_name: p.last_name ?? '',
        extension_name: p.extension_name ?? '',
        birthdate: p.birthdate
          ? String(p.birthdate).slice(0, 10)
          : '',
        gender: p.gender ?? '',
        department_id: p.department_id != null
          ? String(p.department_id)
          : '',
        email: p.email ?? '',
        password: '',
      },
      { emitEvent: false }
    );

    this.form.disable({ emitEvent: false });
    this.editing.set(false);
    this.submitErrors.set([]);
  }


  onSubmit(): void {
    if (!this.editing() || this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Record<string, unknown> = {
      ...this.form.getRawValue(),
    };

    if (!payload['password']) {
      delete payload['password'];
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

        const errors = err.error?.errors as
          | Record<string, string[]>
          | undefined;

        this.submitErrors.set(
          errors
            ? Object.values(errors).flat()
            : [err.error?.message ?? 'Something went wrong.'],
        );
      },
    });
  }


async onRemove(): Promise<void> {
  if (this.removing()) return;

  const p = this.pastor();
  if (!p) return;

  const result = await showAppAlert({
    title: 'Deactivate Pastor?',
    text: `Deactivate ${p.first_name} ${p.last_name}? Their account and records will be kept, but they will no longer be able to sign in.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, deactivate',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: '#be123c',
    cancelButtonColor: '#64748b',
    customClass: {
      popup: 'rounded-xl',
      confirmButton: 'rounded-lg px-4 py-2',
      cancelButton: 'rounded-lg px-4 py-2',
    },
  });

  // Stop if the user cancels or closes the dialog.
  if (!result.isConfirmed) return;

  this.removing.set(true);
  this.submitErrors.set([]);

  this.userService.deactivatePastor(this.id).subscribe({
    next: async () => {
      this.removing.set(false);

      await showAppAlert({
        title: 'Pastor Deactivated',
        text: `${p.first_name} ${p.last_name} was deactivated. Their account and records were kept.`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#065f46',
      });

      await this.router.navigateByUrl(this.backUrl);
    },
    error: async (err: HttpErrorResponse) => {
      this.removing.set(false);

      const message =
        err.error?.message ??
        'Could not deactivate this pastor. Please try again.';

      this.submitErrors.set([message]);

      await showAppAlert({
        title: 'Deactivation Failed',
        text: message,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#065f46',
      });
    },
  });
}

  async onActivate(): Promise<void> {
    if (this.activating()) return;

    const p = this.pastor();
    if (!p) return;

    const result = await showAppAlert({
      title: 'Activate Pastor?',
      text: `Activate ${p.first_name} ${p.last_name} and restore access to this district?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, activate',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: '#065f46',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2',
        cancelButton: 'rounded-lg px-4 py-2',
      },
    });

    if (!result.isConfirmed) return;

    this.activating.set(true);
    this.submitErrors.set([]);

    this.userService.activatePastor(this.id).subscribe({
      next: async () => {
        this.activating.set(false);
        this.pastor.update((current) => current ? { ...current, status: 'active' } : current);

        await showAppAlert({
          title: 'Pastor Activated',
          text: `${p.first_name} ${p.last_name} is now active again.`,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#065f46',
        });

        await this.router.navigateByUrl(this.backUrl);
      },
      error: async (err: HttpErrorResponse) => {
        this.activating.set(false);

        const message =
          err.error?.message ??
          err.error?.errors?.church_id?.[0] ??
          'Could not activate this pastor. Please try again.';

        this.submitErrors.set([message]);

        await showAppAlert({
          title: 'Activation Failed',
          text: message,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#065f46',
        });
      },
    });
  }

  age(birthdate: string): number {
    const born = new Date(birthdate);
    const today = new Date();

    let years = today.getFullYear() - born.getFullYear();
    const monthDifference = today.getMonth() - born.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < born.getDate())
    ) {
      years--;
    }

    return years;
  }
}
