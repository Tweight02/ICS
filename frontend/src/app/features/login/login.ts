import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth-service';
import { SidebarService } from '../../core/services/sidebar/sidebar';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',

  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private sidebar = inject(SidebarService);

  loading = signal(false);
  error = signal<string | null>(null);

  // Controls the eye button on the password field.
  showPassword = signal(false);

  credentials = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  get email() {
    return this.credentials.controls.email;
  }

  get password() {
    return this.credentials.controls.password;
  }

  submit(): void {
    if (this.credentials.invalid) {
      this.credentials.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password, remember } =
      this.credentials.getRawValue();

    this.auth.login({ email, password }, remember).subscribe({
      next: (response) => {
        this.loading.set(false);

        const firstMenuItem = this.sidebar.getMenu(response.user.role)[0];
        if (firstMenuItem) {
          void this.router.navigateByUrl(firstMenuItem.route);
        } else {
          this.error.set('Your account role does not have a configured landing page.');
          console.error('Unknown user role:', response.user.role);
        }
      },

      error: (err: HttpErrorResponse) => {
        this.loading.set(false);

        if (err.status === 422) {
          this.error.set(
            err.error?.errors?.email?.[0] ??
            'The provided credentials are incorrect.'
          );
        } else if (err.status === 429) {
          this.error.set(
            'Too many attempts. Please wait a minute and try again.'
          );
        } else {
          this.error.set(
            'Unable to sign in right now. Please try again.'
          );
        }

        console.error('[LOGIN] Error:', err);
      },
    });
  }
}