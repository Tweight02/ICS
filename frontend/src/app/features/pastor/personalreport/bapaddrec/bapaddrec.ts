
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
import { EMPTY } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { expand, reduce, timeout } from 'rxjs/operators';
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

  // The reporting year comes from the selected report when provided;
  // otherwise, the current year is used for the selected quarter.
  baptismDateYear = new Date().getFullYear();
  baptismDateMin = '';
  baptismDateMax = this.today;

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
    marital_status: null as string | null,
    is_reclaimed: null as boolean | null
  };

  ngOnInit(): void {
    const requestedYear = Number(
      this.route.snapshot.queryParamMap.get('year')
    );

    if (
      Number.isInteger(requestedYear) &&
      requestedYear >= 1900 &&
      requestedYear <= new Date().getFullYear()
    ) {
      this.baptismDateYear = requestedYear;
    }

    const quarter = this.route.snapshot.queryParamMap.get('quarter');

    if (
      quarter === 'Q1' ||
      quarter === 'Q2' ||
      quarter === 'Q3' ||
      quarter === 'Q4'
    ) {
      this.baptism.quarter = quarter;
    }

    this.updateBaptismDateRange();
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

  get filteredChurches(): Church[] {
    const search = this.churchSearch.trim().toLowerCase();

    return this.churches.filter(church =>
      String(church.name || '').toLowerCase().includes(search)
    );
  }

  getSelectedChurchName(): string {
    const selectedChurch = this.churches.find(church =>
      String(church.church_id) === String(this.baptism.church_id)
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
    if (this.churches.length === 0) {
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

    if (this.churches.length > 0) {
      this.churchSearch = '';
      this.churchDropdownOpen = true;
    }
  }

  selectChurch(church: Church): void {
    this.baptism.church_id = church.church_id;
    this.churchSearch = '';
    this.churchDropdownOpen = false;
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
     DATE VALIDATION
  ========================================= */

  private getTodayDate(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

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
   * Calculate the member's 8th birthday.
   * The baptism date must be on or after this date.
   */
  private getMinimumBaptismDate(birthdate: string): string {
    if (!birthdate || !this.isValidDateString(birthdate)) {
      return '';
    }

    const [year, month, day] = birthdate.split('-').map(Number);

    // Add 8 years to the birthdate.
    const minimumDate = new Date(year + 8, month - 1, day);

    const minimumYear = minimumDate.getFullYear();
    const minimumMonth = String(
      minimumDate.getMonth() + 1
    ).padStart(2, '0');
    const minimumDay = String(
      minimumDate.getDate()
    ).padStart(2, '0');

    return `${minimumYear}-${minimumMonth}-${minimumDay}`;
  }

  /**
   * Return the first and last month numbers for a selected quarter.
   */
  private getQuarterMonthRange(
    quarter: string
  ): { startMonth: number; endMonth: number } | null {
    const ranges: Record<string, { startMonth: number; endMonth: number }> = {
      Q1: { startMonth: 1, endMonth: 3 },
      Q2: { startMonth: 4, endMonth: 6 },
      Q3: { startMonth: 7, endMonth: 9 },
      Q4: { startMonth: 10, endMonth: 12 }
    };

    return ranges[quarter] ?? null;
  }

  /**
   * Check whether a date belongs to the selected quarter and reporting year.
   */
  private isDateWithinSelectedQuarter(value: string): boolean {
    if (!value || !this.baptism.quarter || !this.isValidDateString(value)) {
      return false;
    }

    const range = this.getQuarterMonthRange(this.baptism.quarter);

    if (!range) {
      return false;
    }

    const [year, month] = value.split('-').map(Number);

    return (
      year === this.baptismDateYear &&
      month >= range.startMonth &&
      month <= range.endMonth
    );
  }

  /**
   * Update the date picker's minimum and maximum dates based on:
   * 1. The selected quarter and reporting year.
   * 2. The member's 8th birthday.
   * 3. Today's date.
   */
  updateBaptismDateRange(): void {
    const range = this.getQuarterMonthRange(this.baptism.quarter);

    if (!range) {
      this.baptismDateMin = this.minimumBaptismDate || '';
      this.baptismDateMax = this.today;
      return;
    }

    const quarterStart = `${this.baptismDateYear}-${String(range.startMonth).padStart(2, '0')}-01`;
    const quarterEndDate = new Date(
      this.baptismDateYear,
      range.endMonth,
      0
    );
    const quarterEnd = [
      quarterEndDate.getFullYear(),
      String(quarterEndDate.getMonth() + 1).padStart(2, '0'),
      String(quarterEndDate.getDate()).padStart(2, '0')
    ].join('-');

    const minimumDate = this.minimumBaptismDate;

    this.baptismDateMin =
      minimumDate && minimumDate > quarterStart
        ? minimumDate
        : quarterStart;

    this.baptismDateMax =
      quarterEnd < this.today
        ? quarterEnd
        : this.today;
  }

  /**
   * Recalculate the allowed date range when the selected quarter changes.
   */
  onQuarterChange(quarter: string): void {
    this.baptism.quarter = quarter;
    this.baptismDateError = '';
    this.updateBaptismDateRange();
    this.validateBaptismDate();
  }

  /**
   * Update the minimum baptism date whenever the birthdate changes.
   */
  updateMinimumBaptismDate(): void {
    this.baptismDateError = '';

    this.minimumBaptismDate =
      this.getMinimumBaptismDate(this.baptism.birthdate);

    this.updateBaptismDateRange();
    this.validateBaptismDate();
  }

  /**
   * Validate the date of baptism.
   *
   * Rules:
   * 1. Date of baptism must be valid.
   * 2. Member must be at least 8 years old.
   * 3. Date of baptism cannot be later than today.
   * 4. Date of baptism must belong to the selected quarter and year.
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
      this.baptismDateError = 'Please enter a valid date of baptism.';
      return;
    }

    if (!this.baptism.quarter) {
      this.baptism.date_of_baptism = '';
      this.baptismDateError = 'Please select a quarter before selecting the date of baptism.';
      return;
    }

    if (!this.isDateWithinSelectedQuarter(baptismDate)) {
      this.baptism.date_of_baptism = '';
      this.baptismDateError =
        `Date of baptism must fall within ${this.baptism.quarter} of ${this.baptismDateYear}.`;
      return;
    }

    if (baptismDate > this.today) {
      this.baptism.date_of_baptism = '';
      this.baptismDateError = 'Date of baptism cannot be later than today.';
      return;
    }

    const minimumDate =
      this.getMinimumBaptismDate(birthdate);

    if (minimumDate && baptismDate < minimumDate) {
      this.baptism.date_of_baptism = '';
      this.baptismDateError =
        `Date of baptism must be on or after the member's 8th birthday (${minimumDate}).`;
    }
  }

  /**
   * Check whether the baptism date is invalid.
   */
  isBaptismDateInvalid(): boolean {
    const birthdate = this.baptism.birthdate;
    const baptismDate = this.baptism.date_of_baptism;

    if (!baptismDate) {
      return false;
    }

    const minimumDate =
      this.getMinimumBaptismDate(birthdate);

    return (
      !this.isValidDateString(baptismDate) ||
      !this.isDateWithinSelectedQuarter(baptismDate) ||
      baptismDate > this.today ||
      (!!minimumDate && baptismDate < minimumDate)
    );
  }

  /* =========================================
     FORM VALIDATION
  ========================================= */

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

    // Middle Name
    if (middleName && !namePattern.test(middleName)) {
      errors.push('Middle Name contains invalid characters.');
    }

    // Last Name
    if (!lastName) {
      errors.push('Last Name is required.');
    } else if (!namePattern.test(lastName)) {
      errors.push('Last Name must contain valid letters only.');
    }

    // Extension Name
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
      const minimumDate =
        this.getMinimumBaptismDate(this.baptism.birthdate);

      // Date must belong to the selected quarter and reporting year.
      if (
        this.getQuarterMonthRange(this.baptism.quarter) &&
        !this.isDateWithinSelectedQuarter(this.baptism.date_of_baptism)
      ) {
        errors.push(
          `Date of Baptism must fall within ${this.baptism.quarter} of ${this.baptismDateYear}.`
        );
      }

      // Member must be at least 8 years old.
      if (minimumDate && this.baptism.date_of_baptism < minimumDate) {
        errors.push(
          `Date of Baptism must be on or after the member's 8th birthday (${minimumDate}).`
        );
      }

      // Baptism cannot be in the future.
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

  private normalizeText(value: string | null | undefined): string {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase();
  }

  /**
   * Check the three identifying name fields.
   * Extension name and birthdate are intentionally not part of this check.
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

    return sameFirstName && sameMiddleName && sameLastName;
  }

  /**
   * Extract records from common Laravel response formats.
   */
  private extractExistingBaptisms(
    response: any
  ): ExistingBaptism[] | null {

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
      return response.data.data;
    }

    if (Array.isArray(response?.baptisms)) {
      return response.baptisms;
    }

    if (Array.isArray(response?.data?.baptisms)) {
      return response.data.baptisms;
    }

    if (Array.isArray(response?.records)) {
      return response.records;
    }

    if (Array.isArray(response?.data?.records)) {
      return response.data.records;
    }

    if (Array.isArray(response?.result?.data)) {
      return response.result.data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    return null;
  }

  /**
   * Get the next Laravel pagination URL.
   */
  private getNextBaptismPageUrl(response: any): string | null {
    const candidates = [
      response?.next_page_url,
      response?.links?.next,
      response?.data?.next_page_url,
      response?.data?.links?.next,
      response?.meta?.links?.find((link: any) =>
        String(link?.label ?? '').toLowerCase().includes('next')
      )?.url,
      response?.links?.find?.((link: any) =>
        String(link?.label ?? '').toLowerCase().includes('next')
      )?.url
    ];

    const nextUrl = candidates.find(
      (value): value is string =>
        typeof value === 'string' &&
        value.trim() !== '' &&
        value.trim() !== '#'
    );

    return nextUrl?.trim() || null;
  }

  /**
   * Check every page of existing baptism records before saving.
   */
  private checkDuplicateBeforeSaving(payload: any): void {
    this.http
      .get<any>('/api/baptisms')
      .pipe(
        timeout(10000),

        expand(response => {
          const nextPageUrl =
            this.getNextBaptismPageUrl(response);

          return nextPageUrl
            ? this.http.get<any>(nextPageUrl).pipe(timeout(10000))
            : EMPTY;
        }),

        reduce((allRecords: ExistingBaptism[], response: any) => {
          const pageRecords =
            this.extractExistingBaptisms(response);

          if (!pageRecords) {
            throw new Error(
              'The existing baptism records could not be read. No record was saved.'
            );
          }

          return allRecords.concat(pageRecords);
        }, [] as ExistingBaptism[])
      )
      .subscribe({
        next: (existingRecords) => {
          const duplicateExists = existingRecords.some(
            (record: ExistingBaptism) =>
              this.isDuplicateBaptism(record)
          );

          if (duplicateExists) {
            this.saving = false;

            showAppAlert({
              icon: 'warning',
              title: 'Duplicate Baptism Record',
              text: 'This member already has a baptism record. A member with the same first name, middle name, and last name cannot be added again.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });

            return;
          }

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
          } else if (error?.message) {
            errorMessage = error.message;
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
              confirmButtonColor: '#765b52',
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
