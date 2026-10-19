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

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-new-user',
  styleUrl: './new-user.css',
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
          this.serverErrors['church_id'] = name
            ? `${name} is already assigned to this district.`
            : 'This district already has an assigned pastor.';
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
        this.serverErrors = errors
          ? Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]))
          : {};
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