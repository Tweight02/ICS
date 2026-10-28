import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from '../../../../core/services/user/user-service';
import { Church } from '../../../../core/models/church.model';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Button],
  selector: 'app-new-user',
  templateUrl: './new-user.html',
})
export class NewUser implements OnInit {
  private userService = inject(UserService);

  readonly departmentId = 16;
  readonly departmentName = 'Ministerial & Evangelism';

  districts: Church[] = [];
  isSubmitting = false;
  isLoadingDistricts = false;
  districtsError = '';
  formError = '';
  serverErrors: Record<string, string> = {};

  // District combobox state (the church_id form control stays the source of truth)
  districtText = '';     // what the search input displays
  districtFilter = '';   // what filters the list ('' = show all)
  districtOpen = false;
  activeIndex = 0;

  private readonly currentDate = new Date();
  readonly maxBirthdate = [
    this.currentDate.getFullYear(),
    String(this.currentDate.getMonth() + 1).padStart(2, '0'),
    String(this.currentDate.getDate()).padStart(2, '0'),
  ].join('-');

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.isLoadingDistricts = true;
    this.districtsError = '';

    this.userService.getDistricts().subscribe({
      next: (response) => {
        this.districts = response.data ?? [];
        this.isLoadingDistricts = false;
      },
      error: (error) => {
        console.error('Failed to load districts:', error);
        this.districtsError = 'Unable to load districts. Check your connection and try again.';
        this.isLoadingDistricts = false;
      },
    });
  }

  form = new FormGroup({
    first_name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    middle_name: new FormControl('', Validators.maxLength(255)),
    last_name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    extension_name: new FormControl('', Validators.maxLength(50)),
    birthdate: new FormControl('', [
      Validators.required,
      (control) => control.value && control.value >= this.maxBirthdate
        ? { beforeToday: true }
        : null,
    ]),
    gender: new FormControl('', Validators.required),
    department_id: new FormControl(16, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    church_id: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(255)]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  // ---------- District combobox ----------

  get filteredDistricts(): Church[] {
    const q = this.districtFilter.trim().toLowerCase();
    return q
      ? this.districts.filter(d => d.name.toLowerCase().includes(q))
      : this.districts;
  }

  isSelectedDistrict(d: Church): boolean {
    const value = this.form.controls.church_id.value;
    return !!value && String(d.church_id) === value;
  }

  openDistricts(): void {
    if (this.isLoadingDistricts || this.districts.length === 0) return;
    this.districtOpen = true;
    const idx = this.filteredDistricts.findIndex(d => this.isSelectedDistrict(d));
    this.activeIndex = Math.max(idx, 0);
  }

  onDistrictInput(value: string): void {
    this.districtText = value;
    this.districtFilter = value;
    this.districtOpen = true;
    this.activeIndex = 0;
    // Typing invalidates any earlier selection, so a stale district can't be submitted.
    this.form.controls.church_id.setValue('');
    this.clearServerError('church_id');
  }

  selectDistrict(d: Church): void {
    const control = this.form.controls.church_id;
    control.setValue(String(d.church_id)); // string, same as the old <select [value]>
    control.markAsDirty();
    control.markAsTouched();
    this.districtText = d.name;
    this.districtFilter = '';
    this.districtOpen = false;
    this.clearServerError('church_id');
  }

  onDistrictKeydown(e: KeyboardEvent): void {
    const count = this.filteredDistricts.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.districtOpen) { this.openDistricts(); return; }
        this.activeIndex = count ? (this.activeIndex + 1) % count : 0;
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.districtOpen) { this.openDistricts(); return; }
        this.activeIndex = count ? (this.activeIndex - 1 + count) % count : 0;
        this.scrollActiveIntoView();
        break;
      case 'Enter':
        if (this.districtOpen && count) {
          e.preventDefault(); // don't submit the form while picking
          this.selectDistrict(this.filteredDistricts[this.activeIndex]);
        }
        break;
      case 'Escape':
        if (this.districtOpen) { e.preventDefault(); this.districtOpen = false; }
        break;
    }
  }

  onDistrictBlur(): void {
    this.districtOpen = false;
    const control = this.form.controls.church_id;
    control.markAsTouched();
    // If a district is selected, make sure the input shows its name again.
    const match = this.districts.find(d => this.isSelectedDistrict(d));
    if (match) this.districtText = match.name;
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() =>
      document.getElementById('district-opt-' + this.activeIndex)?.scrollIntoView({ block: 'nearest' })
    );
  }

  // ---------- Submit ----------

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formError = '';
    this.serverErrors = {};
    const churchId = this.form.controls.church_id.value!;
    this.isSubmitting = true;

    this.userService.checkDistrictPastor(Number(churchId)).subscribe({
      next: (res) => {
        if (res.exists) {
          this.isSubmitting = false;
          const name = res.pastor
            ? `${res.pastor.first_name} ${res.pastor.last_name}`
            : null;
          Swal.fire({
            icon: 'warning',
            title: 'District already has a pastor',
            text: name
              ? `${name} is already assigned to this district.`
              : 'This district already has an assigned pastor.',
            confirmButtonColor: '#166534',
          });
          return;
        }

        this.createUser(); // no pastor yet, so save
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        console.error('Failed to check district pastor:', error);
        this.formError = 'Unable to verify the selected district. Check your connection and try again.';
      },
    });
  }

  private createUser(): void {
    const payload = {
      ...this.form.getRawValue(),
      department_id: this.departmentId,
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.form.reset({
          first_name: '',
          middle_name: '',
          last_name: '',
          extension_name: '',
          birthdate: '',
          gender: '',
          department_id: this.departmentId,
          church_id: '',
          email: '',
          password: '',
        });
        // Clear the district search box too
        this.districtText = '';
        this.districtFilter = '';
        this.districtOpen = false;

        Swal.fire({
          icon: 'success',
          title: 'User created',
          text: 'The pastor account was created successfully.',
          confirmButtonColor: '#166534',
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Failed to create user:', error);
        const errors = error.error?.errors as Record<string, string[]> | undefined;
        const emailAlreadyUsed = errors?.['email']?.some((message) => /already been taken/i.test(message));
        this.serverErrors = errors
          ? Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]))
          : {};
        if (emailAlreadyUsed) {
          Swal.fire({
            icon: 'warning',
            title: 'Email already in use',
            text: 'An account with this email address already exists.',
            confirmButtonColor: '#166534',
          });
        }
        this.formError = errors
          ? ''
          : error.error?.message ?? 'The pastor account could not be created. Please try again.';
      },
    });
  }

  clearServerError(field: string): void {
    delete this.serverErrors[field];
  }
}