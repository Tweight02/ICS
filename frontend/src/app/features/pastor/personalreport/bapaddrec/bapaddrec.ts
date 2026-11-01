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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { ChurchService } from '../../../../core/services/church/church-service';
import { Button } from '../../../../shared/components/button/button';
import { showAppAlert } from '../../../../shared/utils/app-alert';

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

interface ExistingBaptism {
  baptism_id?: number;
  church_id?: number | string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  extension_name?: string | null;
  birthdate?: string | null;
  date_of_baptism?: string | null;
}

@Component({
  selector: 'app-bapaddrec',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Button
  ],
  templateUrl: './bapaddrec.html',
})
export class BapaddrecComponent implements OnInit {

  private http = inject(HttpClient);
  private churchService = inject(ChurchService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  churches: Church[] = [];
  churchesLoading = false;

  age: number | null = null;

  // Today's date in local YYYY-MM-DD format.
  today = this.getTodayDate();

  // Minimum permitted baptism date and validation message.
  minimumBaptismDate = '';
  baptismDateError = '';

  private readonly savingState = signal(false);

  get saving(): boolean {
    return this.savingState();
  }

  set saving(value: boolean) {
    this.savingState.set(value);
  }

  private readonly swalCustomClass = {
    popup: 'w-[340px] max-w-[calc(100vw-32px)] rounded-[14px] px-[22px] pt-[22px] pb-[18px] font-[Arial,sans-serif] shadow-[0_12px_35px_rgba(15,23,42,0.14)] max-[400px]:w-[calc(100vw-36px)] max-[400px]:px-4 max-[400px]:pt-[19px] max-[400px]:pb-4 [&_.swal2-icon]:mx-auto [&_.swal2-icon]:mt-0.5 [&_.swal2-icon]:mb-[13px] [&_.swal2-icon]:h-12 [&_.swal2-icon]:w-12 [&_.swal2-icon]:border-[3px]',
    title: 'm-0 mb-2 p-0 text-[17px] font-bold leading-[1.4] text-gray-800 max-[400px]:text-base',
    htmlContainer: 'm-0 break-words whitespace-pre-line text-xs leading-[1.6] text-slate-500',
    actions: 'mx-auto mt-[17px] gap-2 max-[400px]:gap-[7px]',
    confirmButton: 'm-0 min-w-[78px] rounded-[7px] border-0 px-[13px] py-[9px] text-[11px] font-semibold leading-[1.4] shadow-none focus-visible:outline-2 focus-visible:outline-[#94a3b8] focus-visible:outline-offset-[3px] max-[400px]:px-[11px]',
    cancelButton: 'm-0 min-w-[78px] rounded-[7px] border-0 px-[13px] py-[9px] text-[11px] font-semibold leading-[1.4] shadow-none focus-visible:outline-2 focus-visible:outline-[#94a3b8] focus-visible:outline-offset-[3px] max-[400px]:px-[11px]'
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

    // Keep this property name for Laravel API compatibility.
    marital_status: null as string | null,

    // null = not selected
    // false = Newly Baptized
    // true = Reclaimed Member
    is_reclaimed: null as boolean | null
  };

  ngOnInit(): void {
    const quarter = this.route.snapshot.queryParamMap.get('quarter');

    if (
      quarter === 'Q1' ||
      quarter === 'Q2' ||
      quarter === 'Q3' ||
      quarter === 'Q4'
    ) {
      this.baptism.quarter = quarter;
    }

    this.loadChurches();
  }

  private navigateBackToReport(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const year = Number(queryParams.get('year'));
    const quarter = queryParams.get('quarter');

    this.router.navigate(['/pastor/deathbap'], {
      queryParams: {
        record: 'baptism',
        ...(Number.isInteger(year) && year > 0 ? { year } : {}),
        ...(quarter === 'Q1' || quarter === 'Q2' || quarter === 'Q3' || quarter === 'Q4'
          ? { quarter }
          : {}),
        ...(queryParams.get('annual') === 'true' ? { annual: true } : {})
      }
    });
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

  /* =========================================
     DATE VALIDATION
  ========================================= */

  /**
   * Check whether a date is a real YYYY-MM-DD date.
   */
  private isValidDateString(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  /**
   * Set the minimum baptism date to one day after
   * the selected birthdate.
   */
  updateMinimumBaptismDate(): void {
    this.baptismDateError = '';

    const birthdate = this.baptism.birthdate;

    if (!birthdate || !this.isValidDateString(birthdate)) {
      this.minimumBaptismDate = '';
      return;
    }

    const [year, month, day] = birthdate.split('-').map(Number);

    const minimumDate = new Date(year, month - 1, day);

    // Baptism must be at least one day after birth.
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

    // Check the currently selected baptism date again
    // whenever the birthdate changes.
    this.validateBaptismDate();
  }

  /**
   * Prevent baptism on or before the birthdate
   * and prevent a future baptism date.
   */
  validateBaptismDate(): void {
    this.baptismDateError = '';

    const birthdate = this.baptism.birthdate;
    const baptismDate = this.baptism.date_of_baptism;

    if (!baptismDate) {
      return;
    }

    if (!this.isValidDateString(baptismDate)) {
      this.baptism.date_of_baptism = '';

      this.baptismDateError =
        'Please enter a valid date of baptism.';

      return;
    }

    if (baptismDate > this.today) {
      this.baptism.date_of_baptism = '';

      this.baptismDateError =
        'Date of baptism cannot be later than today.';

      return;
    }

    if (
      birthdate &&
      this.isValidDateString(birthdate) &&
      baptismDate <= birthdate
    ) {
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

    if (!baptismDate) {
      return false;
    }

    return (
      !this.isValidDateString(baptismDate) ||
      baptismDate > this.today ||
      (
        !!birthdate &&
        this.isValidDateString(birthdate) &&
        baptismDate <= birthdate
      )
    );
  }

  /* =========================================
     FORM VALIDATION
  ========================================= */

  /**
   * Validate all required fields and incorrect input
   * before checking for duplicate records.
   */
  private getValidationErrors(): string[] {
    const errors: string[] = [];

    const firstName = this.baptism.first_name.trim();
    const middleName = this.baptism.middle_name.trim();
    const lastName = this.baptism.last_name.trim();
    const extensionName = this.baptism.extension_name.trim();

    const namePattern =
      /^[A-Za-zÀ-ÖØ-öø-ÿÑñ][A-Za-zÀ-ÖØ-öø-ÿÑñ .'-]*$/;

    const extensionPattern =
      /^[A-Za-z0-9][A-Za-z0-9 .'-]*$/;

    // First Name
    if (!firstName) {
      errors.push('First Name is required.');
    } else if (!namePattern.test(firstName)) {
      errors.push('First Name must contain valid letters only.');
    }

    // Middle Name is optional, but must be valid if entered.
    if (middleName && !namePattern.test(middleName)) {
      errors.push('Middle Name contains invalid characters.');
    }

    // Last Name
    if (!lastName) {
      errors.push('Last Name is required.');
    } else if (!namePattern.test(lastName)) {
      errors.push('Last Name must contain valid letters only.');
    }

    // Extension Name is optional.
    if (extensionName && !extensionPattern.test(extensionName)) {
      errors.push('Extension Name contains invalid characters.');
    }

    // Church
    const validChurch = this.churches.some(church =>
      Number(church.church_id) === Number(this.baptism.church_id)
    );

    if (!this.baptism.church_id || !validChurch) {
      errors.push('Please select a valid church assigned to your district.');
    }

    // Quarter
    const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    if (!validQuarters.includes(this.baptism.quarter)) {
      errors.push('Please select a valid quarter.');
    }

    // Birthdate
    if (!this.baptism.birthdate) {
      errors.push('Birthdate is required.');
    } else if (!this.isValidDateString(this.baptism.birthdate)) {
      errors.push('Please enter a valid birthdate.');
    } else if (this.baptism.birthdate > this.today) {
      errors.push('Birthdate cannot be later than today.');
    }

    // Date of Baptism
    if (!this.baptism.date_of_baptism) {
      errors.push('Date of Baptism is required.');
    } else if (!this.isValidDateString(this.baptism.date_of_baptism)) {
      errors.push('Please enter a valid date of baptism.');
    } else {
      if (
        this.isValidDateString(this.baptism.birthdate) &&
        this.baptism.date_of_baptism <= this.baptism.birthdate
      ) {
        errors.push(
          'Date of Baptism must be at least one day after the birthdate.'
        );
      }

      if (this.baptism.date_of_baptism > this.today) {
        errors.push('Date of Baptism cannot be later than today.');
      }
    }

    // Gender
    if (
      this.baptism.gender !== 'Male' &&
      this.baptism.gender !== 'Female'
    ) {
      errors.push('Please select a valid gender.');
    }

    // Civil Status
    const validCivilStatuses = [
      'Single',
      'Married',
      'Widowed'
    ];

    if (
      !this.baptism.marital_status ||
      !validCivilStatuses.includes(this.baptism.marital_status)
    ) {
      errors.push('Please select a valid civil status.');
    }

    // Baptism Status
    if (
      this.baptism.is_reclaimed !== true &&
      this.baptism.is_reclaimed !== false
    ) {
      errors.push('Please select a baptism status.');
    }

    return errors;
  }

  /**
   * Display validation errors.
   */
  private showValidationErrors(errors: string[]): void {
    showAppAlert({
      icon: 'warning',
      title: 'Please Check Your Input',
      text: errors.join('\n'),
      confirmButtonText: 'OK',
      confirmButtonColor: '#176b52',
      customClass: this.swalCustomClass
    });
  }

  /* =========================================
     DUPLICATE RECORD VALIDATION
  ========================================= */

  /**
   * Normalize text before comparing existing records.
   * This prevents differences in capitalization or extra
   * spaces from bypassing the duplicate check.
   */
  private normalizeText(value: string | null | undefined): string {
    return String(value ?? '')
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase();
  }

  /**
   * Normalize API dates that may include a time component.
   */
  private normalizeDate(value: string | null | undefined): string {
    return String(value ?? '').trim().slice(0, 10);
  }

  /**
   * Check whether an existing record represents the same
   * member and baptism entry.
   *
   * Duplicate comparison uses:
   * - First Name
   * - Middle Name
   * - Last Name
   * - Extension Name
   * - Birthdate
   * - Church
   * - Date of Baptism
   *
   * Baptism status, address, quarter, and minister do not
   * make an otherwise identical baptism entry a new record.
   */
  private isDuplicateBaptism(
    existing: ExistingBaptism
  ): boolean {

    const sameFirstName =
      this.normalizeText(existing.first_name) ===
      this.normalizeText(this.baptism.first_name);

    const sameMiddleName =
      this.normalizeText(existing.middle_name) ===
      this.normalizeText(this.baptism.middle_name);

    const sameLastName =
      this.normalizeText(existing.last_name) ===
      this.normalizeText(this.baptism.last_name);

    const sameExtensionName =
      this.normalizeText(existing.extension_name) ===
      this.normalizeText(this.baptism.extension_name);

    const sameBirthdate =
      this.normalizeDate(existing.birthdate) ===
      this.normalizeDate(this.baptism.birthdate);

    const sameChurch =
      Number(existing.church_id) ===
      Number(this.baptism.church_id);

    const sameBaptismDate =
      this.normalizeDate(existing.date_of_baptism) ===
      this.normalizeDate(this.baptism.date_of_baptism);

    return (
      sameFirstName &&
      sameMiddleName &&
      sameLastName &&
      sameExtensionName &&
      sameBirthdate &&
      sameChurch &&
      sameBaptismDate
    );
  }

  /**
   * Check existing records immediately before saving.
   * Saving is stopped when the same baptism entry already exists.
   */
  private checkDuplicateBeforeSaving(payload: any): void {
    this.http
      .get<any>('/api/baptisms')
      .pipe(timeout(10000))
      .subscribe({

        next: (response) => {
          const existingRecords = Array.isArray(response)
            ? response
            : response?.data;

          if (!Array.isArray(existingRecords)) {
            this.saving = false;

            showAppAlert({
              icon: 'error',
              title: 'Unable to Verify Records',
              text: 'The existing baptism records could not be checked. No record was saved. Please try again.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });

            return;
          }

          const duplicateExists = existingRecords.some(
            (record: ExistingBaptism) =>
              this.isDuplicateBaptism(record)
          );

          if (duplicateExists) {
            this.saving = false;

            showAppAlert({
              icon: 'error',
              title: 'Duplicate Baptism Record',
              text: 'This baptism record already exists for the same member, church, birthdate, and date of baptism. Duplicate entries are not allowed.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });

            return;
          }

          // No duplicate found. Proceed with saving.
          this.submitBaptismRecord(payload);
        },

        error: (error) => {
          console.error(
            'Unable to check existing baptism records:',
            error
          );

          this.saving = false;

          let errorMessage =
            'Existing baptism records could not be checked. No record was saved. Please try again.';

          if (error?.name === 'TimeoutError') {
            errorMessage =
              'The server took too long to check existing baptism records. Please try again.';
          } else if (error?.status === 0) {
            errorMessage =
              'Cannot connect to Laravel. Make sure php artisan serve is running.';
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          }

          showAppAlert({
            icon: 'error',
            title: 'Duplicate Check Failed',
            text: errorMessage,
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /* =========================================
     LOAD DISTRICT CHURCHES
  ========================================= */

  /**
   * Load only churches assigned to the signed-in pastor's district.
   */
  loadChurches(): void {
    this.churchesLoading = true;

    this.churchService
      .getMyDistrictChurches()
      .subscribe({
        next: (response) => {
          const districtId = Number(response.district?.church_id);

          if (!Number.isInteger(districtId) || districtId <= 0) {
            this.churches = [];
            this.churchesLoading = false;

            showAppAlert({
              icon: 'error',
              title: 'Unable to Load District Churches',
              text: 'Your assigned district could not be identified.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });

            return;
          }

          this.churches = (response.data ?? [])
            .filter(church => Number(church.parent_id) === districtId)
            .map(church => ({
              church_id: Number(church.church_id),
              name: church.name ?? '',
              address: church.address ?? '',
              parent_id: church.parent_id === null
                ? null
                : Number(church.parent_id)
            }));

          this.churchesLoading = false;
        },

        error: (error) => {
          console.error('Failed to load district churches:', error);

          this.churches = [];
          this.churchesLoading = false;

          showAppAlert({
            icon: 'error',
            title: 'Unable to Load District Churches',
            text: error.error?.message ||
              'Churches for your district could not be loaded.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /* =========================================
     AGE CALCULATION
  ========================================= */

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

  /* =========================================
     SAVE BAPTISM RECORD
  ========================================= */

  /**
   * Save baptism record after validation and duplicate checking.
   */
  saveBaptism(): void {
    if (this.saving) {
      return;
    }

    // Validate all user inputs first.
    const validationErrors = this.getValidationErrors();

    if (validationErrors.length > 0) {
      this.showValidationErrors(validationErrors);
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

    this.baptism.address =
      this.baptism.address?.trim() || '';

    this.baptism.officiating_minister =
      this.baptism.officiating_minister?.trim() || '';

    this.baptism.place_of_baptism =
      this.baptism.place_of_baptism?.trim() || '';

    this.baptism.quarter =
      this.baptism.quarter.trim();

    /*
     * false = Newly Baptized
     * true  = Reclaimed Member
     */
    const payload = {
      ...this.baptism,
      church_id: Number(this.baptism.church_id),
      is_reclaimed: this.baptism.is_reclaimed === true
    };

    this.saving = true;

    console.log('Checking baptism record before saving:', payload);

    // Check for an existing duplicate before inserting.
    this.checkDuplicateBeforeSaving(payload);
  }

  /**
   * Send the validated, non-duplicate record to Laravel.
   */
  private submitBaptismRecord(payload: any): void {
    console.log('Saving baptism:', payload);

    this.http
      .post<any>(
        '/api/baptisms',
        payload
      )
      .subscribe({

        next: (response) => {
          console.log(
            'Baptism saved successfully:',
            response
          );

          this.saving = false;

          showAppAlert({
            icon: 'success',
            title: 'Saved Successfully',
            text: 'Baptism record has been saved successfully.',
            confirmButtonText: 'Continue',
            confirmButtonColor: '#176b52',
            allowOutsideClick: false,
            customClass: this.swalCustomClass
          }).then((result) => {
            if (result.isConfirmed) {
              this.navigateBackToReport();
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

            showAppAlert({
              icon: 'error',
              title: 'Validation Error',
              text: validationErrors,
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else if (error.error?.message) {
            showAppAlert({
              icon: 'error',
              title: 'Unable to Save Record',
              text: error.error.message,
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else if (error.status === 0) {
            showAppAlert({
              icon: 'error',
              title: 'Connection Failed',
              text: 'Cannot connect to the Laravel server. Make sure php artisan serve is running.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });
          } else {
            showAppAlert({
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
    this.router.navigate(['/pastor/deathbap']);
  }
}