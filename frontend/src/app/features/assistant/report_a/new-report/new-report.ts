import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Department } from '../../../../core/models/department.model';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ReportService } from '../../../../core/services/report/report';
import { UserService } from '../../../../core/services/user/user-service';
import { Button } from '../../../../shared/components/button/button';

@Component({
  imports: [Button, CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-new-report',
  templateUrl: './new-report.html',
})
export class NewReport implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  departments: Department[] = [];
  assignedDepartment: Department | null = null;
  readonly loadingDepartments = signal(false);
  readonly saving = signal(false);
  errorMessage = '';
  successMessage = '';

  readonly form = new FormGroup({
    department_id: new FormControl<number | null>(null, Validators.required),
    program_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    }),
    section_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    }),
    particular_items: new FormArray([
      this.createParticularItemControl()
    ])
  });

  get particularItems(): FormArray<FormControl<string>> {
    return this.form.controls.particular_items;
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loadingDepartments.set(true);
    this.errorMessage = '';
    this.departments = [];
    this.assignedDepartment = null;

    const departmentId = Number(this.authService.getCurrentUser()?.department_id);
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      this.errorMessage = 'Your account does not have an assigned department.';
      this.loadingDepartments.set(false);
      return;
    }

    this.userService.getDepartments().subscribe({
      next: response => {
        const department = (response.data ?? []).find(
          item => Number(item.department_id) === departmentId
        );
        if (!department) {
          this.errorMessage = 'Your assigned department could not be found.';
          this.loadingDepartments.set(false);
          return;
        }

        this.assignedDepartment = department;
        this.departments = [department];
        this.form.controls.department_id.setValue(departmentId);
        this.form.controls.department_id.disable();
        this.loadingDepartments.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to load departments for report template:', error);
        this.errorMessage =
          error.error?.message || 'Unable to load departments. Please retry.';
        this.loadingDepartments.set(false);
      }
    });
  }

  addParticularItem(): void {
    this.particularItems.push(this.createParticularItemControl());
  }

  removeParticularItem(index: number): void {
    if (this.particularItems.length > 1) {
      this.particularItems.removeAt(index);
    }
  }

  saveReportTemplate(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const departmentId = formValue.department_id;
    const particularItems = formValue.particular_items.map(item => item.trim());
    const uniqueNames = new Set(particularItems.map(item => item.toLocaleLowerCase()));

    if (departmentId === null) {
      this.errorMessage = 'Select a department.';
      return;
    }

    if (
      !formValue.program_name.trim() ||
      !formValue.section_name.trim() ||
      particularItems.some(item => !item) ||
      uniqueNames.size !== particularItems.length
    ) {
      this.errorMessage = 'Enter non-empty names and remove duplicate report items.';
      return;
    }

    this.saving.set(true);
    this.reportService.createReportTemplate({
      department_id: departmentId,
      program_name: formValue.program_name.trim(),
      section_name: formValue.section_name.trim(),
      particular_items: particularItems
    }).subscribe({
      next: response => {
        this.successMessage = response.message;
        const departmentId = formValue.department_id;
        this.form.reset({
          department_id: departmentId,
          program_name: '',
          section_name: ''
        });
        this.form.controls.department_id.disable();
        this.particularItems.clear();
        this.addParticularItem();
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to create report template:', error);
        this.errorMessage =
          error.error?.message || 'Unable to create the report template. Please try again.';
        this.saving.set(false);
      }
    });
  }

  trackIndex(index: number): number {
    return index;
  }

  private createParticularItemControl(): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    });
  }
}
