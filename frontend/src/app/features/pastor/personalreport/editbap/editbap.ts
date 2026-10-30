import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { showAppAlert } from '../../../../shared/utils/app-alert';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Button } from '../../../../shared/components/button/button';

interface Church {
  church_id: number;
  name: string;
  address?: string;
  parent_id: number | null;
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
  imports: [CommonModule, FormsModule, Button],
  templateUrl: './editbap.html'
})
export class EditbapComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly churchService = inject(ChurchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly apiUrl = '/api';

  baptismId = 0;

  churches: Church[] = [];
  churchesLoading = false;
  churchesLoaded = false;
  churchesError = '';

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  today = this.getTodayDate();

  // Minimum permitted baptism date: one day after birthdate.
  minimumBaptismDate = '';
  baptismDateError = '';

  baptism: BaptismForm = this.emptyBaptism();

  /* =========================================
     SEARCHABLE CHURCH DROPDOWN
  ========================================= */

  @ViewChild('churchDropdown')
  churchDropdown?: ElementRef<HTMLElement>;

  churchSearch = '';
  churchDropdownOpen = false;

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

  /* =========================================
     BAPTISM DATE VALIDATION
  ========================================= */

  /**
   * Calculate the earliest permitted baptism date.
   * Baptism must be at least one calendar day after birth.
   */
  updateMinimumBaptismDate(): void {
    this.baptismDateError = '';

    const birthdate = this.baptism.birthdate;

    if (!birthdate) {
      this.minimumBaptismDate = '';
      this.baptismDateError = '';
      return;
    }

    const [year, month, day] = birthdate
      .split('-')
      .map(Number);

    // Use the local calendar date to avoid timezone shifts.
    const minimumDate = new Date(
      year,
      month - 1,
      day
    );

    minimumDate.setDate(minimumDate.getDate() + 1);

    const minimumYear = minimumDate.getFullYear();
    const minimumMonth = String(
      minimumDate.getMonth() + 1
    ).padStart(2, '0');
    const minimumDay = String(
      minimumDate.getDate()
    ).padStart(2, '0');

    this.minimumBaptismDate =
      `${minimumYear}-${minimumMonth}-${minimumDay}`;

    // Revalidate the current baptism date whenever
    // the birthdate is changed.
    this.validateBaptismDate();
  }

  /**
   * Reject a baptism date that is the same as
   * or earlier than the birthdate.
   */
  validateBaptismDate(): void {
    this.baptismDateError = '';

    const birthdate = this.baptism.birthdate;
    const baptismDate = this.baptism.date_of_baptism;

    if (!birthdate || !baptismDate) {
      return;
    }

    // YYYY-MM-DD strings can be compared directly.
    if (baptismDate <= birthdate) {
      this.baptism.date_of_baptism = '';

      this.baptismDateError =
        'Date of baptism must be at least one day after the birthdate.';
    }
  }

  /**
   * Additional validation before saving.
   */
  isBaptismDateInvalid(): boolean {
    const birthdate = this.baptism.birthdate;
    const baptismDate = this.baptism.date_of_baptism;

    return (
      !!birthdate &&
      !!baptismDate &&
      baptismDate <= birthdate
    );
  }

  /* =========================================
     LOAD DISTRICT CHURCHES
  ========================================= */

  loadChurches(): void {
    this.churches = [];
    this.churchesError = '';
    this.churchesLoading = true;
    this.churchesLoaded = false;

    this.churchService
      .getMyDistrictChurches()
      .subscribe({
        next: (response: any) => {
          const districtId = Number(
            response?.district?.church_id
          );

          if (
            !Number.isInteger(districtId) ||
            districtId <= 0
          ) {
            this.churches = [];
            this.baptism.church_id = null;
            this.churchesLoading = false;
            this.churchesLoaded = true;

            this.churchesError =
              'Your assigned district could not be identified. Please check your district information.';

            this.cdr.detectChanges();
            return;
          }

          const districtChurches = Array.isArray(
            response?.data
          )
            ? response.data
            : [];

          this.churches = districtChurches
            .filter(
              (church: any) =>
                church.parent_id != null &&
                Number(church.parent_id) === districtId
            )
            .map(
              (church: any): Church => ({
                church_id: Number(church.church_id),
                name: church.name ?? '',
                address: church.address ?? '',
                parent_id:
                  church.parent_id == null
                    ? null
                    : Number(church.parent_id)
              })
            );

          this.churchesLoading = false;
          this.churchesLoaded = true;

          this.ensureSelectedChurchBelongsToDistrict();

          if (this.churches.length === 0) {
            this.churchesError =
              'No churches are assigned to your district.';
          }

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error(
            'Failed to load district churches:',
            error
          );

          this.churches = [];
          this.baptism.church_id = null;
          this.churchesLoading = false;
          this.churchesLoaded = true;

          this.churchesError =
            error?.error?.message ||
            'Unable to load churches for your district. Please try again.';

          this.cdr.detectChanges();
        }
      });
  }

  private ensureSelectedChurchBelongsToDistrict(): void {
    if (
      this.baptism.church_id == null ||
      !this.churchesLoaded
    ) {
      return;
    }

    const belongsToDistrict = this.churches.some(
      church =>
        church.church_id ===
        Number(this.baptism.church_id)
    );

    if (!belongsToDistrict) {
      this.baptism.church_id = null;
    }
  }

  /* =========================================
     SEARCHABLE CHURCH DROPDOWN FUNCTIONS
  ========================================= */

  get filteredChurches(): Church[] {
    const search = this.churchSearch
      .trim()
      .toLowerCase();

    return this.churches.filter(church =>
      String(church.name || '')
        .toLowerCase()
        .includes(search)
    );
  }

  getSelectedChurchName(): string {
    const selectedChurch = this.churches.find(
      church =>
        String(church.church_id) ===
        String(this.baptism.church_id)
    );

    return selectedChurch?.name || '';
  }

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

  openChurchDropdown(): void {
    if (
      this.churchesLoading ||
      this.churches.length === 0
    ) {
      return;
    }

    if (!this.churchDropdownOpen) {
      this.churchSearch = '';
      this.churchDropdownOpen = true;
    }
  }

  onChurchSearch(event: Event): void {
    this.churchSearch =
      (event.target as HTMLInputElement).value;

    this.churchDropdownOpen = true;
  }

  toggleChurchDropdown(): void {
    if (this.churchDropdownOpen) {
      this.closeChurchDropdown();
      return;
    }

    if (
      !this.churchesLoading &&
      this.churches.length > 0
    ) {
      this.churchSearch = '';
      this.churchDropdownOpen = true;
    }
  }

  selectChurch(church: Church): void {
    const isAssignedChurch = this.churches.some(
      item =>
        item.church_id === Number(church.church_id)
    );

    if (!isAssignedChurch) {
      this.errorMessage =
        'You can only select a church under your assigned district.';
      return;
    }

    this.baptism.church_id = church.church_id;
    this.churchSearch = '';
    this.churchDropdownOpen = false;
    this.churchesError = '';
    this.errorMessage = '';

    this.cdr.detectChanges();
  }

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

  closeChurchDropdown(): void {
    this.churchDropdownOpen = false;
    this.churchSearch = '';
  }

  /* =========================================
     LOAD BAPTISM RECORD
  ========================================= */

  loadBaptism(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();

    console.log(
      'Loading selected baptism record ID:',
      this.baptismId
    );

    this.http
      .get<any>(
        `${this.apiUrl}/baptisms/${this.baptismId}`
      )
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          console.log(
            'Baptism API response:',
            response
          );

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
            selected.baptism_id ??
            selected.id ??
            0
          );

          if (
            responseId > 0 &&
            responseId !== this.baptismId
          ) {
            this.errorMessage =
              'The returned baptism record does not match the selected record.';
            this.cdr.detectChanges();
            return;
          }

          this.baptism = {
            baptism_id:
              responseId || this.baptismId,

            church_id:
              selected.church_id == null
                ? null
                : Number(selected.church_id),

            quarter: this.normalizeQuarter(
              selected.quarter
            ),

            first_name: selected.first_name ?? '',
            middle_name: selected.middle_name ?? '',
            last_name: selected.last_name ?? '',
            extension_name: selected.extension_name ?? '',

            birthdate: this.dateForInput(
              selected.birthdate
            ),

            gender: selected.gender ?? '',
            address: selected.address ?? '',

            officiating_minister:
              selected.officiating_minister ?? '',

            place_of_baptism:
              selected.place_of_baptism ?? '',

            date_of_baptism: this.dateForInput(
              selected.date_of_baptism
            ),

            marital_status:
              selected.marital_status ?? '',

            is_reclaimed: this.toBoolean(
              selected.is_reclaimed
            )
          };

          // Calculate the minimum date immediately after loading.
          // This also detects an existing baptism date that is
          // the same as or earlier than the birthdate.
          this.updateMinimumBaptismDate();

          this.ensureSelectedChurchBelongsToDistrict();

          console.log(
            'Selected baptism information loaded:',
            this.baptism
          );

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
    return value
      ? String(value).substring(0, 10)
      : '';
  }

  private normalizeQuarter(
    value: string | null | undefined
  ): string {
    const quarter = (value ?? '')
      .trim()
      .toUpperCase();

    const match = quarter.match(
      /^(?:Q\s*|QUARTER\s*)?([1-4])(?:ST|ND|RD|TH)?(?:\s*QUARTER)?$/
    );

    return match
      ? `Q${match[1]}`
      : quarter || 'Q1';
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

  /* =========================================
     SAVE CHANGES
  ========================================= */

  saveChanges(formIsValid: boolean): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Block an invalid baptism date before other form validation.
    if (
      this.baptism.birthdate &&
      this.baptism.date_of_baptism &&
      this.baptism.date_of_baptism <=
        this.baptism.birthdate
    ) {
      this.baptismDateError =
        'Date of baptism must be at least one day after the birthdate.';

      this.errorMessage = this.baptismDateError;
      return;
    }

    if (this.baptismDateError) {
      this.errorMessage = this.baptismDateError;
      return;
    }

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
      this.errorMessage =
        'Invalid baptism record ID.';
      return;
    }

    if (
      this.churchesLoading ||
      !this.churchesLoaded
    ) {
      this.errorMessage =
        'Please wait until your district churches have loaded.';
      return;
    }

    if (!this.baptism.church_id) {
      this.errorMessage =
        'Please select a church under your assigned district.';
      return;
    }

    const selectedChurchId = Number(
      this.baptism.church_id
    );

    const churchBelongsToDistrict = this.churches.some(
      church =>
        church.church_id === selectedChurchId
    );

    if (!churchBelongsToDistrict) {
      this.baptism.church_id = null;

      this.errorMessage =
        'You can only select a church under your assigned district. Please select an available church.';

      this.cdr.detectChanges();
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

    // Final date check: a baptism date must be strictly
    // later than the birthdate, never equal to or earlier.
    if (
      this.baptism.birthdate &&
      this.baptism.date_of_baptism &&
      this.baptism.date_of_baptism <=
        this.baptism.birthdate
    ) {
      this.errorMessage =
        'Date of baptism must be at least one day after the birthdate.';
      return;
    }

    const payload = {
      church_id: selectedChurchId,

      quarter: this.normalizeQuarter(
        this.baptism.quarter
      ),

      first_name:
        this.baptism.first_name.trim(),

      middle_name:
        (this.baptism.middle_name ?? '').trim(),

      last_name:
        this.baptism.last_name.trim(),

      extension_name:
        this.baptism.extension_name.trim() || null,

      birthdate: this.baptism.birthdate,
      gender: this.baptism.gender,
      address: this.baptism.address.trim(),

      officiating_minister:
        this.baptism.officiating_minister.trim(),

      place_of_baptism:
        this.baptism.place_of_baptism.trim(),

      date_of_baptism:
        this.baptism.date_of_baptism,

      marital_status:
        this.baptism.marital_status,

      is_reclaimed:
        this.baptism.is_reclaimed ? 1 : 0
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

          showAppAlert({
            icon: 'success',
            title: 'Saved Successfully!',
            text: message,
            confirmButtonText: 'OK',
            confirmButtonColor: '#0c502f'
          }).then(() => {
            this.router.navigate([
              '/pastor/deathbap'
            ]);
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
              error.error.errors as Record<
                string,
                string[]
              >
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

  /* =========================================
     CANCEL EDITING
  ========================================= */

  // Cancel editing without showing a SweetAlert confirmation.
  cancelEdit(): void {
    this.router.navigate([
      '/pastor/deathbap'
    ]);
  }
}