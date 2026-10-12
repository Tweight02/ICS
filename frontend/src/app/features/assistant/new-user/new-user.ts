import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from '../../../core/services/user/user-service';
import { Church } from '../../../core/models/church.model';
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

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.userService.getDistricts().subscribe({
      next: (response) => (this.districts = response.data),
      error: (error) => console.error('Failed to load districts:', error),
    });
  }

  form = new FormGroup({
    first_name: new FormControl('', Validators.required),
    middle_name: new FormControl('', Validators.required),
    last_name: new FormControl('', Validators.required),
    extension_name: new FormControl(''),
    birthdate: new FormControl('', Validators.required),
    gender: new FormControl('', Validators.required),
    department_id: new FormControl(16, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    church_id: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const churchId = this.form.controls.church_id.value!;
    this.isSubmitting = true;

    this.userService.checkDistrictPastor(Number(churchId)).subscribe({
      next: (res) => {
        if (res.exists) {
          this.isSubmitting = false;
          const name = res.pastor
            ? `${res.pastor.first_name} ${res.pastor.last_name}`
            : null;
          this.showPastorExistsAlert(churchId, name);
          return;
        }

        this.createUser(); // no pastor yet, so save
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        console.error('Failed to check district pastor:', error);
        Swal.fire({
          icon: 'error',
          title: 'Could not verify district',
          text: 'Unable to check whether this district already has a pastor. Please try again.',
          confirmButtonColor: '#166534',
        });
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

        // Safety net: backend rejected it because the district already has a pastor
        if (error.status === 409 || error.status === 422) {
          const message =
            error.error?.errors?.church_id?.[0] ??
            error.error?.message ??
            'Please check the form and try again.';
          Swal.fire({
            icon: 'warning',
            title: 'Unable to create user',
            text: message,
            confirmButtonColor: '#166534',
          });
          return;
        }

        Swal.fire({
          icon: 'error',
          title: 'Failed to create user',
          text: 'An unexpected error occurred.',
          confirmButtonColor: '#166534',
        });
      },
    });
  }

  private showPastorExistsAlert(churchId: string, pastorName?: string | null): void {
    const district = this.districts.find(
      (d) => String(d.church_id) === String(churchId)
    );

    Swal.fire({
      icon: 'warning',
      title: 'District already has a pastor',
      html: `
        <b>${district?.name ?? 'This district'}</b> already has an assigned pastor: <br>${
          pastorName ? `<b>${pastorName}</b>` : ''
        }.<br>Please select a different district.`,
      confirmButtonText: 'OK',
      confirmButtonColor: '#166534',
    });
  }
}