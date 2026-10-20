import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

@Component({
  selector: 'app-bapaddrec',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './bapaddrec.html',
  styleUrls: ['./bapaddrec.css']
})
export class BapaddrecComponent implements OnInit {

  private http = inject(HttpClient);
  private router = inject(Router);

  churches: Church[] = [];

  age: number | null = null;

  // Today's date in local YYYY-MM-DD format.
  today = this.getTodayDate();

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

  baptism = {
    church_id: null as number | null,
    quarter: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    extension_name: '',
    birthdate: '',
    gender: null as string | null,
    address: '',
    officiating_minister: '',
    place_of_baptism: '',
    date_of_baptism: '',
    marital_status: null as string | null,

    // null = not selected
    // false = Newly Baptized
    // true = Reclaimed Member
    is_reclaimed: null as boolean | null
  };

  ngOnInit(): void {
    this.loadChurches();
  }

  /* =========================================
     SEARCHABLE CHURCH DROPDOWN
  ========================================= */

  @ViewChild('churchDropdown')
  churchDropdown?: ElementRef<HTMLElement>;

  churchSearch = '';
  churchDropdownOpen = false;

  /**
   * Filter church names while typing.
   */
  get filteredChurches(): Church[] {
    const search = this.churchSearch.trim().toLowerCase();

    return this.churches.filter(church =>
      String(church.name || '').toLowerCase().includes(search)
    );
  }

  /**
   * Get the name of the currently selected church.
   */
  getSelectedChurchName(): string {
    const selectedChurch = this.churches.find(church =>
      String(church.church_id) === String(this.baptism.church_id)
    );

    return selectedChurch?.name || '';
  }

  /**
   * Compare church IDs safely.
   */
  sameChurch(
    id1: number | null | undefined,
    id2: number | null | undefined
  ): boolean {
    return (
      id1 != null &&
      id2 != null &&
      String(id1) === String(id2)
    );
  }

  /**
   * Open the dropdown when the search field receives focus.
   */
  openChurchDropdown(): void {
    if (this.churches.length === 0) {
      return;
    }

    if (!this.churchDropdownOpen) {
      this.churchSearch = '';
      this.churchDropdownOpen = true;
    }
  }

  /**
   * Update the search as the user types.
   */
  onChurchSearch(event: Event): void {
    this.churchSearch =
      (event.target as HTMLInputElement).value;

    this.churchDropdownOpen = true;
  }

  /**
   * Toggle the dropdown using its arrow button.
   */
  toggleChurchDropdown(): void {
    if (this.churchDropdownOpen) {
      this.closeChurchDropdown();
      return;
    }

    if (this.churches.length > 0) {
      this.churchSearch = '';
      this.churchDropdownOpen = true;
    }
  }

  /**
   * Select a church and update the existing form model.
   */
  selectChurch(church: Church): void {
    this.baptism.church_id = church.church_id;
    this.churchSearch = '';
    this.churchDropdownOpen = false;
  }

  /**
   * Close the dropdown when clicking outside it.
   */
  @HostListener('document:click', ['$event'])
  onChurchDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (
      target &&
      this.churchDropdownOpen &&
      !this.churchDropdown?.nativeElement.contains(target)
    ) {
      this.closeChurchDropdown();
    }
  }

  /**
   * Close the dropdown and clear the search text.
   */
  closeChurchDropdown(): void {
    this.churchDropdownOpen = false;
    this.churchSearch = '';
  }

  /**
   * Get today's local date.
   */
  private getTodayDate(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Load all churches directly from Laravel.
   */
  loadChurches(): void {
    const apiUrl = 'http://127.0.0.1:8000/api/churches';

    console.log('Loading churches from:', apiUrl);

    this.http
      .get<any>(apiUrl)
      .subscribe({

        next: (response) => {
          console.log('Church API response:', response);

          const data = response?.data ?? response;

          if (!Array.isArray(data)) {
            console.error(
              'Church response is not an array:',
              response
            );

            this.churches = [];
            return;
          }

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

          console.log(
            'Churches loaded successfully:',
            this.churches
          );
        },

        error: (error) => {
          console.error('Failed to load churches:', error);

          this.churches = [];

          if (error.status === 0) {
            Swal.fire({
              icon: 'error',
              title: 'Connection Failed',
              text: 'Cannot connect to the Laravel server. Make sure php artisan serve is running.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else if (error.error?.message) {
            Swal.fire({
              icon: 'error',
              title: 'Unable to Load Churches',
              text: error.error.message,
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Unable to Load Churches',
              text: 'Failed to load churches from the database.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          }
        }
      });
  }

  /**
   * Calculate age from birthdate.
   */
  calculateAge(): void {
    if (!this.baptism.birthdate) {
      this.age = null;
      return;
    }

    const birthDate = new Date(
      this.baptism.birthdate + 'T00:00:00'
    );

    if (isNaN(birthDate.getTime())) {
      this.age = null;
      return;
    }

    const today = new Date();

    let calculatedAge =
      today.getFullYear() - birthDate.getFullYear();

    const monthDifference =
      today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ) {
      calculatedAge--;
    }

    this.age = calculatedAge;
  }

  /**
   * Save baptism record.
   */
  saveBaptism(): void {
    // Validate required fields.
    if (
      !this.baptism.first_name.trim() ||
      !this.baptism.last_name.trim() ||
      !this.baptism.church_id ||
      !this.baptism.quarter.trim() ||
      !this.baptism.birthdate ||
      !this.baptism.date_of_baptism ||
      !this.baptism.gender ||
      !this.baptism.marital_status ||
      this.baptism.is_reclaimed === null
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Information',
        text: 'Please complete all required fields, including the baptism status.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Prevent a future birthdate.
    if (this.baptism.birthdate > this.today) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Birthdate',
        text: 'Birthdate cannot be later than today.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Prevent a future baptism date.
    if (this.baptism.date_of_baptism > this.today) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Baptism Date',
        text: 'Date of Baptism cannot be later than today.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Clean up text fields.
    this.baptism.first_name =
      this.baptism.first_name.trim();

    this.baptism.middle_name =
      this.baptism.middle_name?.trim() || '';

    this.baptism.last_name =
      this.baptism.last_name.trim();

    this.baptism.extension_name =
      this.baptism.extension_name?.trim() || '';

    this.baptism.quarter =
      this.baptism.quarter.trim();

    /*
     * false = Newly Baptized
     * true  = Reclaimed Member
     */
    const payload = {
      ...this.baptism,
      is_reclaimed: this.baptism.is_reclaimed === true
    };

    this.saving = true;

    console.log('Saving baptism:', payload);

    this.http
      .post<any>(
        'http://127.0.0.1:8000/api/baptisms',
        payload
      )
      .subscribe({

        next: (response) => {
          console.log(
            'Baptism saved successfully:',
            response
          );

          this.saving = false;

          Swal.fire({
            icon: 'success',
            title: 'Saved Successfully',
            text: 'Baptism record has been saved successfully.',
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
          console.error('Error saving baptism:', error);

          this.saving = false;

          if (error.error?.errors) {
            const validationErrors =
              Object.values(error.error.errors)
                .flat()
                .join('\n');

            Swal.fire({
              icon: 'error',
              title: 'Validation Error',
              text: validationErrors,
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else if (error.error?.message) {
            Swal.fire({
              icon: 'error',
              title: 'Unable to Save Record',
              text: error.error.message,
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else if (error.status === 0) {
            Swal.fire({
              icon: 'error',
              title: 'Connection Failed',
              text: 'Cannot connect to the Laravel server. Make sure php artisan serve is running.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Save Failed',
              text: 'Failed to save baptism record.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          }
        }
      });
  }

  /**
   * Cancel adding a baptism record.
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