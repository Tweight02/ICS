import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user/user-service';
import { Church } from '../../../core/models/church.model';
import { Department } from '../../../core/models/department.model';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-new-user',
  styleUrl: './new-user.css',
  templateUrl: './new-user.html',
})
export class NewUser implements OnInit{
  private userService = inject(UserService);

  ngOnInit(): void {
    this.loadDistricts();
    this.loadDepartments();
  }

  districts: Church[] = [];
  departments: Department[] = [];

loadDistricts(): void {
  this.userService.getDistricts().subscribe({
    next: (response) => {
      console.log('Districts response:', response);
      this.districts = response.data;
    },
    error: (error) => {
      console.error('Failed to load districts:', error);
    }
  });
}

  loadDepartments(): void {
    this.userService.getDepartments().subscribe({
      next: (data) => {
        console.log('Departments response:', data);
        this.departments = data.data;
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
      }
    });
  }

  form = new FormGroup({
    first_name: new FormControl('', Validators.required),
    middle_name: new FormControl(''),
    last_name: new FormControl('', Validators.required),
    extension_name: new FormControl(''),
    birthdate: new FormControl('', Validators.required),
    gender: new FormControl('', Validators.required),
    department_id: new FormControl('', Validators.required),
    church_id: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    console.log('Sending:', this.form.value);
    this.userService.createUser(this.form.value).subscribe({
      next: (response) => {
        console.log('User created successfully:', response);
        this.form.reset();
        alert('User created successfully!');
      },
      error: (error) => {
        console.error('Failed to create user:', error);
        if (error.error?.errors) {
          console.error('Validation errors:', error.error.errors);
        }
      }
    });
  }
}
