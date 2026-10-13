import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { RepresentativeService } from '../../../core/services/representative/representative-service'; // adjust to your real path
import { Representative } from '../../../core/models/representative.model';

@Component({
    selector: 'app-edit-representative',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './edit-representative.html',
    styleUrl: './edit-representative.css'
})
export class EditRepresentative implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private rep = inject(RepresentativeService);

    id = 0;
    churchName = signal('');
    loading = signal(true);
    saving = signal(false);
    deleting = signal(false);
    editing = signal(false);
    loadFailed = signal(false);
    error = signal('');
    fieldErrors = signal<Record<string, string>>({});

    form = this.fb.nonNullable.group({
        // Required by the API's update rules; sent back unchanged, not editable here
        department_id: [0, Validators.required],
        first_name: ['', [Validators.required, Validators.maxLength(255)]],
        middle_name: [''],
        last_name: ['', [Validators.required, Validators.maxLength(255)]],
        extension_name: [''],
        birthdate: ['', Validators.required],
        gender: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.minLength(8)]
    });

    /** Snapshot of the loaded values, used to restore the form on Cancel */
    private original: ReturnType<EditRepresentative['form']['getRawValue']> | null = null;

    ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id'));
        this.loadRepresentative();
    }

    loadRepresentative(): void {
        this.loading.set(true);
        this.loadFailed.set(false);
        this.error.set('');

        this.rep.getById(this.id)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (response) => {
                    const r = response.data;

                    this.churchName.set(r.church?.name ?? '—');
                    this.form.patchValue({
                        department_id: r.department_id,
                        first_name: r.first_name,
                        middle_name: r.middle_name ?? '',
                        last_name: r.last_name,
                        extension_name: r.extension_name ?? '',
                        birthdate: r.birthdate ? String(r.birthdate).slice(0, 10) : '',
                        gender: r.gender ?? '',
                        email: r.email,
                        password: ''
                    });

                    // Start in view-only mode
                    this.original = this.form.getRawValue();
                    this.form.disable();
                    this.editing.set(false);
                },
                error: (err) => {
                    console.error('Failed to load representative:', err);
                    this.loadFailed.set(true);
                    this.error.set(
                        err?.error?.message ?? 'Unable to load this representative.'
                    );
                }
            });
    }

    startEdit(): void {
        this.error.set('');
        this.fieldErrors.set({});
        this.form.enable();
        this.editing.set(true);
    }

    cancelEdit(): void {
        if (this.original) {
            this.form.reset(this.original);
        }
        this.form.disable();
        this.error.set('');
        this.fieldErrors.set({});
        this.editing.set(false);
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const { first_name, last_name } = this.form.getRawValue();

        const result = await Swal.fire({
            title: 'Save changes?',
            text: `Update the details of ${first_name} ${last_name}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, save',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0F4A30',
            cancelButtonColor: '#64748b',
            reverseButtons: true
        });

        if (!result.isConfirmed) {
            return;
        }

        this.submit();
    }

    private submit(): void {
        this.saving.set(true);
        this.error.set('');
        this.fieldErrors.set({});

        const value = this.form.getRawValue();

        // Empty optional fields go as null; empty password is omitted (API keeps the old one)
        const payload: Record<string, unknown> = {
            ...value,
            middle_name: value.middle_name || null,
            extension_name: value.extension_name || null
        };

        if (!value.password) {
            delete payload['password'];
        }

        this.rep.update(this.id, payload)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: () => {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Representative updated',
                        showConfirmButton: false,
                        timer: 2500,
                        timerProgressBar: true
                    });
                    this.router.navigate(['/pastor/view-representatives']);
                },
                error: (err) => {
                    console.error('Failed to update representative:', err);

                    if (err?.status === 422 && err.error?.errors) {
                        const mapped: Record<string, string> = {};
                        for (const [key, messages] of Object.entries(err.error.errors)) {
                            mapped[key] = (messages as string[])[0];
                        }
                        this.fieldErrors.set(mapped);
                        this.error.set('Please fix the highlighted fields.');
                    } else {
                        this.error.set(
                            err?.error?.message ?? 'Unable to save changes. Please try again.'
                        );
                    }
                }
            });
    }

    async deleteRepresentative(): Promise<void> {
        const { first_name, last_name } = this.form.getRawValue();

        const result = await Swal.fire({
            title: 'Delete representative?',
            text: `${first_name} ${last_name} will be permanently removed. This can't be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            reverseButtons: true
        });

        if (!result.isConfirmed) {
            return;
        }

        this.deleting.set(true);
        this.error.set('');

        this.rep.deleteRepresentative(this.id)
            .pipe(finalize(() => this.deleting.set(false)))
            .subscribe({
                next: () => {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Representative deleted',
                        showConfirmButton: false,
                        timer: 2500,
                        timerProgressBar: true
                    });
                    this.router.navigate(['/pastor/view-representatives']);
                },
                error: (err) => {
                    console.error('Failed to delete representative:', err);
                    this.error.set(
                        err?.error?.message ?? 'Unable to delete this representative. Please try again.'
                    );
                }
            });
    }

    /** Server-side error for a field, or '' */
    serverError(field: string): string {
        return this.fieldErrors()[field] ?? '';
    }

    /** True when a field should show its red state */
    invalid(field: string): boolean {
        const control = this.form.get(field);
        return !!this.serverError(field) || !!(control && control.invalid && control.touched);
    }
}