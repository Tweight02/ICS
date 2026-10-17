import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AssignablePastor, DistrictPastorAssignment } from '../../../../core/models/pastor.model';
import { UserService } from '../../../../core/services/user/user-service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-assign-user',
  styleUrl: './assign-user.css',
  templateUrl: './assign-user.html',
})
export class AssignUser implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  assignments = signal<DistrictPastorAssignment[]>([]);
  pastors = signal<AssignablePastor[]>([]);
  vacantDistricts = computed(() => this.assignments().filter((assignment) => assignment.pastor_user_id === null));
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');
  submitError = signal('');
  successMessage = signal('');

  form = this.formBuilder.nonNullable.group({
    district_id: ['', Validators.required],
    user_id: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.userService.getDistrictPastorAssignments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.assignments.set(response.assignments);
          this.pastors.set(response.pastors);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Unable to load district assignments. Please try again.');
          this.loading.set(false);
        },
      });
  }

  onSubmit(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const districtId = Number(this.form.controls.district_id.value);
    const pastorId = Number(this.form.controls.user_id.value);
    const assignment = this.assignments().find((item) => item.church_id === districtId);
    const pastor = this.pastors().find((item) => item.user_id === pastorId);

    if (!assignment || !pastor) {
      this.submitError.set('Select a valid district and active pastor.');
      return;
    }

    if (assignment.pastor_user_id !== null && assignment.pastor_user_id !== pastorId) {
      this.submitError.set('That district already has an assigned pastor.');
      return;
    }

    if (assignment.pastor_user_id === pastorId) {
      this.submitError.set('This pastor is already assigned to that district.');
      return;
    }

    this.saving.set(true);
    this.submitError.set('');
    this.successMessage.set('');

    this.userService.assignPastorToDistrict(districtId, pastorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.successMessage.set(response.message);
          this.form.reset();
          this.loadAssignments();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.submitError.set(
            error.error?.errors?.district_id?.[0]
              ?? error.error?.errors?.user_id?.[0]
              ?? error.error?.message
              ?? 'The assignment could not be saved. Please try again.'
          );
        },
      });
  }
}
