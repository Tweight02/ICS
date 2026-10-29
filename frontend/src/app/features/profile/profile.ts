import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/services/auth/auth-service';
import { User } from '../../core/models/user.model';
import { Button } from '../../shared/components/button/button';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly location = inject(Location);
  private readonly apiBase = '';
  private previewUrl: string | null = null;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly imagePreview = signal<string | null>(null);
  readonly user = signal<User | null>(null);

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(255)]],
    middle_name: ['', Validators.maxLength(255)],
    last_name: ['', [Validators.required, Validators.maxLength(255)]],
    extension_name: ['', Validators.maxLength(50)],
    email: ['', [Validators.required, Validators.email]],
    birthdate: ['', Validators.required],
    gender: ['', Validators.required],
  });

  ngOnInit(): void {
    const cachedUser = this.auth.getCurrentUser();
    if (cachedUser) {
      this.applyUser(cachedUser);
      this.loading.set(false);
    }

    this.auth.getProfile().subscribe({
      next: (user) => {
        this.applyUser(user);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          cachedUser
            ? 'Showing the profile information saved at login. Could not refresh it from the server.'
            : error.error?.message ?? 'Could not load your profile.'
        );
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.releasePreviewUrl();
  }

  goBack(): void {
    this.location.back();
  }

  get profileImageUrl(): string | null {
    const image = this.user()?.profile_image;
    if (!image) return null;
    if (/^https?:\/\//i.test(image)) return image;

    return `${this.apiBase}/storage/${image.replace(/^\/+/, '')}`;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.errorMessage.set('Choose a JPG, PNG, or WebP image.');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set('The image must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    this.releasePreviewUrl();
    this.selectedFile.set(file);
    this.previewUrl = URL.createObjectURL(file);
    this.imagePreview.set(this.previewUrl);
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    Object.entries(this.form.getRawValue()).forEach(([key, value]) => {
      formData.append(key, value);
    });
    const image = this.selectedFile();
    if (image) formData.append('profile_image', image);

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.auth.updateProfile(formData).subscribe({
      next: ({ user }) => {
        this.user.set(user);
        this.patchForm(user);
        this.selectedFile.set(null);
        this.releasePreviewUrl();
        this.successMessage.set('Your profile has been updated.');
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const validationErrors = error.error?.errors as
          | Record<string, string[]>
          | undefined;
        this.errorMessage.set(
          validationErrors
            ? Object.values(validationErrors).flat().join(' ')
            : error.error?.message ?? 'Could not save your profile. Please try again.'
        );
        this.saving.set(false);
      },
    });
  }

  private patchForm(user: User): void {
    this.form.patchValue({
      first_name: user.first_name ?? '',
      middle_name: user.middle_name ?? '',
      last_name: user.last_name ?? '',
      extension_name: user.extension_name ?? '',
      email: user.email ?? '',
      birthdate: user.birthdate?.slice(0, 10) ?? '',
      gender: user.gender?.toLowerCase() ?? '',
    });
  }

  private applyUser(user: User): void {
    this.user.set(user);
    this.patchForm(user);
  }

  private releasePreviewUrl(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.imagePreview.set(null);
  }
}
