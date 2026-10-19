import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface Church {
  church_id: number;
  name: string;
  address?: string;
  parent_id?: number | null;
}

interface BaptismForm {
  baptism_id: number;
  church_id: number | null;
  quarter: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  extension_name: string;
  birthdate: string;
  gender: string;
  address: string;
  officiating_minister: string;
  place_of_baptism: string;
  date_of_baptism: string;
  marital_status: string;
  is_reclaimed: boolean;
}

@Component({
  selector: 'app-editbap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editbap.html',
  styleUrl: './editbap.css'
})
export class EditbapComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  baptismId = 0;
  churches: Church[] = [];

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  today = this.getTodayDate();

  baptism: BaptismForm = this.emptyBaptism();

  ngOnInit(): void {
    this.baptismId =
      Number(this.route.snapshot.paramMap.get('id')) || 0;

    if (!this.baptismId) {
      this.loading = false;
      this.errorMessage =
        'No baptism record was selected. Please select a record from the baptism list.';
      return;
    }

    this.loadChurches();
    this.loadBaptism();
  }

  private emptyBaptism(): BaptismForm {
    return {
      baptism_id: 0,
      church_id: null,
      quarter: 'Q1',
      first_name: '',
      middle_name: '',
      last_name: '',
      extension_name: '',
      birthdate: '',
      gender: '',
      address: '',
      officiating_minister: '',
      place_of_baptism: '',
      date_of_baptism: '',
      marital_status: '',
      is_reclaimed: false
    };
  }


  

  private getTodayDate(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private unwrapData(response: any): any {
    let data = response;

    for (let i = 0; i < 2; i++) {
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        Object.prototype.hasOwnProperty.call(data, 'data')
      ) {
        data = data.data;
      } else {
        break;
      }
    }

    return data;
  }

  // Load the available churches for the selector.
  loadChurches(): void {
    this.http
      .get<any>(`${this.apiUrl}/churches`)
      .pipe(timeout(10000))
      .subscribe({
        next: response => {
          const data = this.unwrapData(response);

          this.churches = Array.isArray(data)
            ? data.map((church: any): Church => ({
                church_id: Number(church.church_id),
                name: church.name ?? '',
                address: church.address ?? '',
                parent_id:
                  church.parent_id == null
                    ? null
                    : Number(church.parent_id)
              }))
            : [];

          this.cdr.detectChanges();
        },

        error: error => {
          console.error('Failed to load churches:', error);
          this.churches = [];
          this.cdr.detectChanges();
        }
      });
  }

  // Load and display the selected baptism record.
  loadBaptism(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Refresh the view immediately to show the loading state.
    this.cdr.detectChanges();

    console.log(
      'Loading selected baptism record ID:',
      this.baptismId
    );

    this.http
      .get<any>(`${this.apiUrl}/baptisms/${this.baptismId}`)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;

          // Important: refresh the view after the request finishes.
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          console.log('Baptism API response:', response);

          const selected = this.unwrapData(response);

          if (
            !selected ||
            Array.isArray(selected) ||
            typeof selected !== 'object'
          ) {
            this.errorMessage =
              'The server did not return a valid baptism record.';
            this.cdr.detectChanges();
            return;
          }

          const responseId = Number(
            selected.baptism_id ?? selected.id ?? 0
          );

          if (responseId > 0 && responseId !== this.baptismId) {
            this.errorMessage =
              'The returned baptism record does not match the selected record.';
            this.cdr.detectChanges();
            return;
          }

          // Populate the form with the selected member's information.
          this.baptism = {
            baptism_id: responseId || this.baptismId,

            church_id:
              selected.church_id == null
                ? null
                : Number(selected.church_id),

            quarter: this.normalizeQuarter(selected.quarter),

            first_name: selected.first_name ?? '',
            middle_name: selected.middle_name ?? '',
            last_name: selected.last_name ?? '',
            extension_name: selected.extension_name ?? '',

            birthdate: this.dateForInput(selected.birthdate),
            gender: selected.gender ?? '',
            address: selected.address ?? '',

            officiating_minister:
              selected.officiating_minister ?? '',

            place_of_baptism:
              selected.place_of_baptism ?? '',

            date_of_baptism:
              this.dateForInput(selected.date_of_baptism),

            marital_status: selected.marital_status ?? '',

            is_reclaimed: this.toBoolean(selected.is_reclaimed)
          };

          console.log(
            'Selected baptism information loaded:',
            this.baptism
          );

          // Make the populated form appear immediately.
          this.cdr.detectChanges();
        },

        error: error => {
          console.error(
            'Failed to load baptism record:',
            error
          );

          if (
            error?.name === 'TimeoutError' ||
            error?.name === 'TimeoutErrorImpl'
          ) {
            this.errorMessage =
              'The request timed out. Check your Laravel server and database.';
          } else if (error?.status === 0) {
            this.errorMessage =
              'Cannot connect to Laravel. Make sure php artisan serve is running and CORS is configured.';
          } else if (error?.status === 404) {
            this.errorMessage =
              'Baptism record not found. Check the selected record ID and API endpoint.';
          } else {
            this.errorMessage =
              error?.error?.message ||
              'Unable to load the selected baptism record.';
          }

          this.cdr.detectChanges();
        }
      });
  }

  private dateForInput(
    value: string | null | undefined
  ): string {
    return value ? String(value).substring(0, 10) : '';
  }

  private normalizeQuarter(
    value: string | null | undefined
  ): string {
    const quarter = (value ?? '').trim().toUpperCase();

    const match = quarter.match(
      /^(?:Q\s*|QUARTER\s*)?([1-4])(?:ST|ND|RD|TH)?(?:\s*QUARTER)?$/
    );

    return match ? `Q${match[1]}` : quarter || 'Q1';
  }

  private toBoolean(
    value: boolean | number | string | null | undefined
  ): boolean {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();

    return (
      value === true ||
      value === 1 ||
      normalized === '1' ||
      normalized === 'true'
    );
  }

  // Validate and save the edited baptism record.
  saveChanges(formIsValid: boolean): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!formIsValid) {
      this.errorMessage =
        'Please complete all required fields before saving.';
      return;
    }

    if (this.saving) {
      return;
    }

    if (
      !Number.isInteger(this.baptismId) ||
      this.baptismId <= 0
    ) {
      this.errorMessage = 'Invalid baptism record ID.';
      return;
    }

    if (!this.baptism.church_id) {
      this.errorMessage = 'Please select a church.';
      return;
    }

    if (
      this.baptism.birthdate &&
      this.baptism.birthdate > this.today
    ) {
      this.errorMessage =
        'Birthdate cannot be in the future.';
      return;
    }

    if (
      this.baptism.date_of_baptism &&
      this.baptism.date_of_baptism > this.today
    ) {
      this.errorMessage =
        'Date of baptism cannot be in the future.';
      return;
    }

    if (
      this.baptism.birthdate &&
      this.baptism.date_of_baptism &&
      this.baptism.date_of_baptism < this.baptism.birthdate
    ) {
      this.errorMessage =
        'Date of baptism cannot be earlier than the birthdate.';
      return;
    }

    const payload = {
      church_id: Number(this.baptism.church_id),
      quarter: this.normalizeQuarter(this.baptism.quarter),

      first_name: this.baptism.first_name.trim(),
      middle_name: (this.baptism.middle_name ?? '').trim(),
      last_name: this.baptism.last_name.trim(),

      extension_name:
        this.baptism.extension_name.trim() || null,

      birthdate: this.baptism.birthdate,
      gender: this.baptism.gender,
      address: this.baptism.address.trim(),

      officiating_minister:
        this.baptism.officiating_minister.trim(),

      place_of_baptism:
        this.baptism.place_of_baptism.trim(),

      date_of_baptism: this.baptism.date_of_baptism,
      marital_status: this.baptism.marital_status,

      is_reclaimed: this.baptism.is_reclaimed ? 1 : 0
    };

    this.saving = true;
    this.cdr.detectChanges();

    this.http
      .put<any>(
        `${this.apiUrl}/baptisms/${this.baptismId}`,
        payload
      )
      .pipe(
        timeout(15000),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
    next: response => {
  const message =
    response?.message ||
    'Baptism record updated successfully.';

  this.successMessage = message;

  this.cdr.detectChanges();

  Swal.fire({
    icon: 'success',
    title: 'Saved Successfully!',
    text: message,
    confirmButtonText: 'OK',
    confirmButtonColor: '#0c502f'
  }).then(() => {
    this.router.navigate(['/pastor/deathbap']);
  });
},

        error: error => {
          console.error(
            'Failed to update baptism record:',
            error
          );

          if (error?.status === 0) {
            this.errorMessage =
              'Cannot connect to Laravel. Check the server and CORS configuration.';
          } else if (error?.status === 404) {
            this.errorMessage =
              'Baptism record not found, or the update endpoint is unavailable.';
          } else if (
            error?.name === 'TimeoutError' ||
            error?.name === 'TimeoutErrorImpl'
          ) {
            this.errorMessage =
              'The update request timed out. Please check your Laravel server.';
          } else if (error?.error?.errors) {
            this.errorMessage = Object.values(
              error.error.errors as Record<string, string[]>
            )
              .flat()
              .join(' ');
          } else {
            this.errorMessage =
              error?.error?.message ||
              'Failed to update the baptism record.';
          }

          this.cdr.detectChanges();
        }
      });
  }

  // Cancel editing without saving.
  cancelEdit(): void {
    this.router.navigate(['/pastor/deathbap']);
  }
}