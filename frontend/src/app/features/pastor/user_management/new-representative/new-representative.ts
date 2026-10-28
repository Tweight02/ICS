import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { RepresentativeService } from '../../../../core/services/representative/representative-service'; // adjust to your real path
import { Button } from '../../../../shared/components/button/button';

interface Church {
    church_id: number;
    name: string;
}

@Component({
    selector: 'app-new-representative',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, Button],
    templateUrl: './new-representative.html',

})
export class NewRepresentative implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private rep = inject(RepresentativeService);

    churches = signal<Church[]>([]);
    loadingChurches = signal(true);
    saving = signal(false);
    showPassword = signal(false);
    error = signal('');
    fieldErrors = signal<Record<string, string>>({});

    // Church combobox state
    churchText = signal('');     // what the input displays
    churchQuery = signal('');    // what the list filters on (empty = show all)
    churchOpen = signal(false);
    activeIndex = signal(0);

    filteredChurches = computed(() => {
        const q = this.churchQuery().trim().toLowerCase();
        const list = this.churches();
        return q ? list.filter(c => c.name.toLowerCase().includes(q)) : list;
    });

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

    // ---- Church combobox ----

    isSelectedChurch(church: Church): boolean {
        return this.form.controls.church_id.value === church.church_id;
    }

    openChurches(): void {
        if (this.churchOpen()) return;
        this.churchQuery.set('');
        const idx = this.churches().findIndex(c => this.isSelectedChurch(c));
        this.activeIndex.set(Math.max(idx, 0));
        this.churchOpen.set(true);
    }

    onChurchInput(value: string): void {
        this.churchText.set(value);
        this.churchQuery.set(value);
        this.activeIndex.set(0);
        this.churchOpen.set(true);
        this.form.controls.church_id.setValue(0); // typing clears the selection
    }

    selectChurch(church: Church): void {
        this.form.controls.church_id.setValue(church.church_id);
        this.churchText.set(church.name);
        this.churchQuery.set('');
        this.churchOpen.set(false);
        this.clearServerError('church_id');
    }

    onChurchKeydown(e: KeyboardEvent): void {
        const list = this.filteredChurches();
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!this.churchOpen()) { this.openChurches(); return; }
                this.activeIndex.set(Math.min(this.activeIndex() + 1, list.length - 1));
                this.scrollActiveChurchIntoView();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
                this.scrollActiveChurchIntoView();
                break;
            case 'Enter':
                if (this.churchOpen()) {
                    e.preventDefault(); // don't submit the form
                    const active = list[this.activeIndex()];
                    if (active) this.selectChurch(active);
                }
                break;
            case 'Escape':
                if (this.churchOpen()) { e.preventDefault(); this.churchOpen.set(false); }
                break;
        }
    }

    onChurchBlur(): void {
        this.churchOpen.set(false);
        const ctrl = this.form.controls.church_id;
        ctrl.markAsTouched();
        // Revert the text to the selected church, or clear it if nothing valid was picked
        const selected = this.churches().find(c => c.church_id === ctrl.value);
        this.churchText.set(selected ? selected.name : '');
        this.churchQuery.set('');
    }

    private scrollActiveChurchIntoView(): void {
        setTimeout(() => document.getElementById('church-opt-' + this.activeIndex())?.scrollIntoView({ block: 'nearest' }));
    }

    // ---- Save / submit ----

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

    clearServerError(field: string): void {
        if (!this.fieldErrors()[field]) return;
        this.fieldErrors.update(({ [field]: _removed, ...rest }) => rest);
    }

    invalid(field: string): boolean {
        const control = this.form.get(field);
        return !!this.serverError(field) || !!(control && control.invalid && control.touched);
    }
}