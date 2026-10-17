import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { RepresentativeService } from '../../../../core/services/representative/representative-service'; // adjust to your real path

@Component({
    selector: 'app-new-representative',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './new-representative.html',
    styleUrl: './new-representative.css'
})
export class NewRepresentative implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private rep = inject(RepresentativeService);

    churches = signal<{ church_id: number; name: string }[]>([]);
    loadingChurches = signal(true);
    saving = signal(false);
    showPassword = signal(false);
    error = signal('');
    fieldErrors = signal<Record<string, string>>({});

    /** Latest allowed birthdate (yesterday) so the date picker matches the API's "before:today" rule */
    maxBirthdate = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    })();

    form = this.fb.nonNullable.group({
        church_id: [0, [Validators.required, Validators.min(1)]],
        first_name: ['', [Validators.required, Validators.maxLength(255)]],
        middle_name: [''],
        last_name: ['', [Validators.required, Validators.maxLength(255)]],
        extension_name: [''],
        birthdate: ['', Validators.required],
        gender: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]]
    });

    ngOnInit(): void {
        this.loadChurches();
    }

    loadChurches(): void {
        this.loadingChurches.set(true);

        this.rep.getAvailableChurches()
            .pipe(finalize(() => this.loadingChurches.set(false)))
            .subscribe({
                next: (response) => this.churches.set(response.data ?? []),
                error: (err) => {
                    console.error('Failed to load churches:', err);
                    this.error.set(
                        err?.error?.message ?? `Unable to load available churches (HTTP ${err.status}).`
                    );
                }
            });
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const { first_name, last_name } = this.form.getRawValue();

        const result = await Swal.fire({
            title: 'Add representative?',
            text: `${first_name} ${last_name} will be assigned to the selected church.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, add',
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

        const payload = {
            ...value,
            church_id: Number(value.church_id),
            middle_name: value.middle_name || null,
            extension_name: value.extension_name || null
        };

        this.rep.create(payload)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: () => {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Representative added',
                        showConfirmButton: false,
                        timer: 2500,
                        timerProgressBar: true
                    });
                    this.router.navigate(['/pastor/view-representatives']);
                },
                error: (err) => {
                    console.error('Failed to add representative:', err);

                    if (err?.status === 422 && err.error?.errors) {
                        const mapped: Record<string, string> = {};
                        for (const [key, messages] of Object.entries(err.error.errors)) {
                            mapped[key] = (messages as string[])[0];
                        }
                        this.fieldErrors.set(mapped);
                        this.error.set('Please fix the highlighted fields.');
                    } else {
                        this.error.set(
                            err?.error?.message ?? 'Unable to add representative. Please try again.'
                        );
                    }
                }
            });
    }

    serverError(field: string): string {
        return this.fieldErrors()[field] ?? '';
    }

    invalid(field: string): boolean {
        const control = this.form.get(field);
        return !!this.serverError(field) || !!(control && control.invalid && control.touched);
    }
}