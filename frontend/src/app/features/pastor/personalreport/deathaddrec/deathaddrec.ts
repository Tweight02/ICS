import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

interface Baptism {
  baptism_id: number;
  church_id: number;
  quarter: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  extension_name: string | null;
  birthdate: string;
  gender: string;
  marital_status: string;
}

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

interface DeathRecord {
  death_id: number;
  baptism_id: number;
  quarter: string;
  date_of_death: string;
}

@Component({
  selector: 'app-deathaddrec',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './deathaddrec.html',
  styleUrls: ['./deathaddrec.css']
})
export class DeathaddrecComponent implements OnInit {

  private http = inject(HttpClient);
  private router = inject(Router);

  baptisms: Baptism[] = [];
  churches: Church[] = [];
  deaths: DeathRecord[] = [];

  selectedBaptism: Baptism | null = null;

  // Use the browser's local date, not a UTC date.
  today = this.getTodayDate();

  deathLoadError = false;

  private readonly loadingBaptismsState = signal(false);

  get loadingBaptisms(): boolean {
    return this.loadingBaptismsState();
  }

  set loadingBaptisms(value: boolean) {
    this.loadingBaptismsState.set(value);
  }

  private readonly loadingDeathsState = signal(false);

  get loadingDeaths(): boolean {
    return this.loadingDeathsState();
  }

  set loadingDeaths(value: boolean) {
    this.loadingDeathsState.set(value);
  }

  private readonly savingState = signal(false);

  get saving(): boolean {
    return this.savingState();
  }

  set saving(value: boolean) {
    this.savingState.set(value);
  }

  private readonly swalCustomClass = {
    popup: 'compact-swal-popup',
    title: 'compact-swal-title',
    htmlContainer: 'compact-swal-message',
    actions: 'compact-swal-actions',
    confirmButton: 'compact-swal-confirm',
    cancelButton: 'compact-swal-cancel'
  };

  death = {
    baptism_id: null as number | null,
    quarter: '',
    date_of_death: ''
  };

  ngOnInit(): void {
    this.loadBaptisms();
    this.loadChurches();
    this.loadDeaths();
  }

  /**
   * Return today's date in local YYYY-MM-DD format.
   */
  private getTodayDate(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Baptized members who do not already have a death record.
   */
  get availableBaptisms(): Baptism[] {
    const deceasedIds = new Set(
      this.deaths.map(record => Number(record.baptism_id))
    );

    return this.baptisms.filter(
      baptism => !deceasedIds.has(Number(baptism.baptism_id))
    );
  }

  /**
   * Check whether a person already has a death record.
   */
  isAlreadyDeceased(baptismId: number | null): boolean {
    if (baptismId === null) {
      return false;
    }

    return this.deaths.some(
      record => Number(record.baptism_id) === Number(baptismId)
    );
  }

  /**
   * Load baptism records from Laravel.
   */
  loadBaptisms(): void {
    this.loadingBaptisms = true;

    this.http
      .get<any>('http://127.0.0.1:8000/api/baptisms')
      .subscribe({
        next: (response) => {
          const data = response?.data ?? response;

          this.baptisms = Array.isArray(data) ? data : [];
          this.loadingBaptisms = false;

          console.log('Baptism records loaded:', this.baptisms);
        },
        error: (error) => {
          console.error('Failed to load baptism records:', error);

          this.baptisms = [];
          this.loadingBaptisms = false;

          Swal.fire({
            icon: 'error',
            title: 'Unable to Load Members',
            text: 'Baptism records could not be loaded. Please try again.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /**
   * Load existing death records.
   * These records are used to prevent duplicate selections.
   */
  loadDeaths(): void {
    this.loadingDeaths = true;
    this.deathLoadError = false;

    this.http
      .get<any>('http://127.0.0.1:8000/api/deaths')
      .subscribe({
        next: (response) => {
          const data = response?.data ?? response;

          this.deaths = Array.isArray(data) ? data : [];
          this.loadingDeaths = false;

          // Clear a selected member if a death record now exists.
          if (this.isAlreadyDeceased(this.death.baptism_id)) {
            this.death.baptism_id = null;
            this.selectedBaptism = null;
          }

          console.log('Existing death records loaded:', this.deaths);
        },
        error: (error) => {
          console.error('Failed to load death records:', error);

          this.deaths = [];
          this.loadingDeaths = false;
          this.deathLoadError = true;

          Swal.fire({
            icon: 'error',
            title: 'Unable to Verify Records',
            text: 'Existing death records could not be checked. Please refresh the page and try again.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /**
   * Load churches.
   */
  loadChurches(): void {
    this.http
      .get<any>('http://127.0.0.1:8000/api/churches')
      .subscribe({
        next: (response) => {
          const data = response?.data ?? response;

          if (Array.isArray(data)) {
            this.churches = data.map(
              (church: any): Church => ({
                church_id: Number(church.church_id),
                name: church.name ?? '',
                address: church.address ?? '',
                parent_id:
                  church.parent_id !== null &&
                  church.parent_id !== undefined
                    ? Number(church.parent_id)
                    : null
              })
            );
          } else {
            this.churches = [];
          }
        },
        error: (error) => {
          console.error('Failed to load churches:', error);

          this.churches = [];

          Swal.fire({
            icon: 'error',
            title: 'Unable to Load Churches',
            text: 'Please check your Laravel server connection.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /**
   * Select a member who has not already been recorded as deceased.
   */
  selectBaptism(baptismId: number | null): void {
    if (baptismId === null || baptismId === undefined) {
      this.selectedBaptism = null;
      this.death.baptism_id = null;
      return;
    }

    const selectedId = Number(baptismId);

    if (this.isAlreadyDeceased(selectedId)) {
      this.death.baptism_id = null;
      this.selectedBaptism = null;

      Swal.fire({
        icon: 'warning',
        title: 'Death Record Already Exists',
        text: 'This member already has a death record and cannot be added again.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    this.death.baptism_id = selectedId;

    this.selectedBaptism =
      this.availableBaptisms.find(
        baptism => Number(baptism.baptism_id) === selectedId
      ) ?? null;

    if (!this.selectedBaptism) {
      this.death.baptism_id = null;
    }

    console.log('Selected baptism:', this.selectedBaptism);
  }

  /**
   * Get full name.
   */
  getFullName(baptism: Baptism): string {
    const parts: string[] = [];

    if (baptism.first_name?.trim()) {
      parts.push(baptism.first_name.trim());
    }

    if (baptism.middle_name?.trim()) {
      parts.push(baptism.middle_name.trim());
    }

    if (baptism.last_name?.trim()) {
      parts.push(baptism.last_name.trim());
    }

    if (baptism.extension_name?.trim()) {
      parts.push(baptism.extension_name.trim());
    }

    return parts.join(' ');
  }

  /**
   * Get church name.
   */
  getChurchName(churchId: number | undefined): string {
    if (churchId === undefined || churchId === null) {
      return '';
    }

    const church = this.churches.find(
      item => Number(item.church_id) === Number(churchId)
    );

    return church ? church.name : 'Unknown Church';
  }

  /**
   * Calculate current age.
   */
  calculateAge(birthdate: string): number | string {
    if (!birthdate) {
      return '';
    }

    const birthDate = new Date(
      birthdate.substring(0, 10) + 'T00:00:00'
    );

    if (isNaN(birthDate.getTime())) {
      return '';
    }

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference =
      today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ) {
      age--;
    }

    return age;
  }

  /**
   * Calculate age on the date of death.
   */
  calculateAgeAtDeath(
    birthdate: string,
    dateOfDeath: string
  ): number | string {
    if (!birthdate || !dateOfDeath) {
      return '';
    }

    const birthDate = new Date(
      birthdate.substring(0, 10) + 'T00:00:00'
    );

    const deathDate = new Date(
      dateOfDeath.substring(0, 10) + 'T00:00:00'
    );

    if (
      isNaN(birthDate.getTime()) ||
      isNaN(deathDate.getTime()) ||
      deathDate < birthDate
    ) {
      return '';
    }

    let age = deathDate.getFullYear() - birthDate.getFullYear();

    const monthDifference =
      deathDate.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        deathDate.getDate() < birthDate.getDate()
      )
    ) {
      age--;
    }

    return age;
  }

  /**
   * Save a death record.
   */
  saveDeath(): void {
    if (this.loadingBaptisms || this.loadingDeaths || this.deathLoadError) {
      Swal.fire({
        icon: 'warning',
        title: 'Records Not Ready',
        text: 'Please wait until the existing records have been loaded and verified.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    if (
      this.death.baptism_id === null ||
      !this.death.quarter.trim() ||
      !this.death.date_of_death
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Information',
        text: 'Please select a member, quarter, and date of death.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    const baptismId = Number(this.death.baptism_id);

    if (!Number.isInteger(baptismId) || baptismId <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Selection',
        text: 'Please select a valid baptized member.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Check again before submitting to prevent duplicates.
    if (this.isAlreadyDeceased(baptismId)) {
      this.death.baptism_id = null;
      this.selectedBaptism = null;

      Swal.fire({
        icon: 'warning',
        title: 'Death Record Already Exists',
        text: 'This member already has a death record.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Do not allow a future date.
    if (this.death.date_of_death > this.today) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Check that death date is on or after birthdate.
    if (
      this.selectedBaptism &&
      this.calculateAgeAtDeath(
        this.selectedBaptism.birthdate,
        this.death.date_of_death
      ) === ''
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'The date of death must be on or after the birthdate.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    const payload = {
      baptism_id: baptismId,
      quarter: this.death.quarter.trim(),
      date_of_death: this.death.date_of_death
    };

    this.saving = true;

    this.http
      .post<any>('http://127.0.0.1:8000/api/deaths', payload)
      .subscribe({
        next: (response) => {
          console.log('Death record saved:', response);

          this.saving = false;

          Swal.fire({
            icon: 'success',
            title: 'Saved Successfully',
            text: 'Death record has been saved successfully.',
            confirmButtonText: 'Continue',
            confirmButtonColor: '#176b52',
            allowOutsideClick: false,
            customClass: this.swalCustomClass
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/pastor/deathbap']);
            }
          });
        },

        error: (error) => {
          console.error('Death save error:', error);

          this.saving = false;

          // If another request created the death record,
          // refresh the list of unavailable members.
          if (
            error.status === 422 &&
            error.error?.errors?.baptism_id
          ) {
            this.loadDeaths();
          }

          const validationErrors = error.error?.errors
            ? Object.values(error.error.errors).flat().join('\n')
            : '';

          Swal.fire({
            icon: 'error',
            title: error.status === 422
              ? 'Unable to Save Record'
              : 'Save Failed',
            text: validationErrors ||
              error.error?.message ||
              error.error?.error ||
              (error.status === 0
                ? 'Cannot connect to Laravel. Make sure php artisan serve is running.'
                : 'Failed to save death record. Please try again.'),
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /**
   * Cancel adding a death record.
   */
  cancelForm(): void {
    Swal.fire({
      icon: 'warning',
      iconColor: '#dc3545',
      title: 'Cancel Adding Record?',
      text: 'Your unsaved baptism information will be discarded.',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel',
      cancelButtonText: 'Continue Editing',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#14532d',
      reverseButtons: true,
      customClass: this.swalCustomClass
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/pastor/deathbap']);
      }
    });
  }
}