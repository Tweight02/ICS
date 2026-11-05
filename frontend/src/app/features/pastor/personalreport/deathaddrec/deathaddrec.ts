
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
import { showAppAlert } from '../../../../shared/utils/app-alert';
import { Button } from '../../../../shared/components/button/button';
import { ChurchService } from '../../../../core/services/church/church-service';

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
  baptism_id: number | null;
  quarter: string;
  date_of_death: string;

  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  extension_name?: string | null;
  church_id?: number | null;
  birthdate?: string | null;
  gender?: string | null;
  marital_status?: string | null;

  baptism?: Partial<Baptism> | null;
}

@Component({
  selector: 'app-deathaddrec',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Button
  ],
  templateUrl: './deathaddrec.html',
})
export class DeathaddrecComponent implements OnInit {

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private churchService = inject(ChurchService);

  baptisms: Baptism[] = [];
  churches: Church[] = [];
  deaths: DeathRecord[] = [];

  selectedBaptism: Baptism | null = null;

  // baptized = select existing baptism record
  // new = manually enter deceased person
  entryMode: 'baptized' | 'new' = 'baptized';

  churchesLoading = false;

  // Searchable Baptized Member dropdown
  @ViewChild('memberDropdown')
  memberDropdown?: ElementRef<HTMLElement>;

  baptismSearch = '';
  memberDropdownOpen = false;

  // Use browser local date, not UTC date.
  today = this.getTodayDate();

  // Use the selected reporting year when supplied by the previous page.
  // Otherwise, use the current calendar year.
  deathDateYear = new Date().getFullYear();

  deathDateError = '';
  baptismLoadError = false;
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
    popup: 'w-[340px] max-w-[calc(100vw-32px)] rounded-[14px] px-[22px] pt-[22px] pb-[18px] font-[Arial,sans-serif] shadow-[0_12px_35px_rgba(15,23,42,0.14)] max-[400px]:w-[calc(100vw-36px)] max-[400px]:px-4 max-[400px]:pt-[19px] max-[400px]:pb-4 [&_.swal2-icon]:mx-auto [&_.swal2-icon]:mt-0.5 [&_.swal2-icon]:mb-[13px] [&_.swal2-icon]:h-12 [&_.swal2-icon]:w-12 [&_.swal2-icon]:border-[3px]',
    title: 'm-0 mb-2 p-0 text-[17px] font-bold leading-[1.4] text-gray-800 max-[400px]:text-base',
    htmlContainer: 'm-0 break-words whitespace-pre-line text-xs leading-[1.6] text-slate-500',
    actions: 'mx-auto mt-[17px] gap-2 max-[400px]:gap-[7px]',
    confirmButton: 'm-0 min-w-[78px] rounded-[7px] border-0 px-[13px] py-[9px] text-[11px] font-semibold leading-[1.4] shadow-none focus-visible:outline-2 focus-visible:outline-[#94a3b8] focus-visible:outline-offset-[3px] max-[400px]:px-[11px]',
    cancelButton: 'm-0 min-w-[78px] rounded-[7px] border-0 px-[13px] py-[9px] text-[11px] font-semibold leading-[1.4] shadow-none focus-visible:outline-2 focus-visible:outline-[#94a3b8] focus-visible:outline-offset-[3px] max-[400px]:px-[11px]'
  };

  death = {
    baptism_id: null as number | null,
    quarter: '',
    date_of_death: '',

    // Manually entered deceased person information.
    first_name: '',
    middle_name: '',
    last_name: '',
    extension_name: '',
    church_id: null as number | null,
    birthdate: '',
    gender: null as string | null,
    marital_status: null as string | null
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
      this.deathDateYear = requestedYear;
    }

    this.loadBaptisms();
    this.loadChurches();
    this.loadDeaths();
  }

  /* ==========================================
     ENTRY MODE
  ========================================== */

  /**
   * Switch between existing baptism member
   * and manually entered death record.
   */
  setEntryMode(mode: 'baptized' | 'new'): void {
    if (this.saving || this.entryMode === mode) {
      return;
    }

    this.entryMode = mode;

    this.closeBaptismDropdown();

    this.selectedBaptism = null;

    this.death.baptism_id = null;
    this.death.date_of_death = '';

    this.death.first_name = '';
    this.death.middle_name = '';
    this.death.last_name = '';
    this.death.extension_name = '';
    this.death.church_id = null;
    this.death.birthdate = '';
    this.death.gender = null;
    this.death.marital_status = null;
    this.deathDateError = '';
  }

  /* ==========================================
     DATE HELPERS
  ========================================== */

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
   * Validate real YYYY-MM-DD dates.
   */
  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split('-').map(Number);

    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  /**
   * Return the birthdate for the current entry mode.
   */
  getDeathBirthdate(): string {
    if (this.entryMode === 'baptized') {
      return this.selectedBaptism?.birthdate?.substring(0, 10) || '';
    }

    return this.death.birthdate?.substring(0, 10) || '';
  }

  /**
   * Return the earliest allowed death date:
   * one day after birthdate.
   */
  getMinimumDeathDate(): string {
    const birthdate = this.getDeathBirthdate();

    if (!birthdate || !this.isValidDate(birthdate)) {
      return '';
    }

    const [year, month, day] = birthdate.split('-').map(Number);

    const birthDate = new Date(year, month - 1, day);

    birthDate.setDate(birthDate.getDate() + 1);

    const minimumYear = birthDate.getFullYear();
    const minimumMonth = String(
      birthDate.getMonth() + 1
    ).padStart(2, '0');
    const minimumDay = String(
      birthDate.getDate()
    ).padStart(2, '0');

    return `${minimumYear}-${minimumMonth}-${minimumDay}`;
  }

  /**
   * Return the start and end dates for the selected quarter
   * within the reporting year.
   */
  private getQuarterDateBounds(): { start: string; end: string } | null {
    const quarterRanges: Record<
      string,
      { startMonth: number; endMonth: number }
    > = {
      Q1: { startMonth: 1, endMonth: 3 },
      Q2: { startMonth: 4, endMonth: 6 },
      Q3: { startMonth: 7, endMonth: 9 },
      Q4: { startMonth: 10, endMonth: 12 }
    };

    const range = quarterRanges[this.death.quarter];

    if (!range) {
      return null;
    }

    const start =
      `${this.deathDateYear}-${String(range.startMonth).padStart(2, '0')}-01`;

    const lastDay = new Date(
      this.deathDateYear,
      range.endMonth,
      0
    );

    const end = [
      lastDay.getFullYear(),
      String(lastDay.getMonth() + 1).padStart(2, '0'),
      String(lastDay.getDate()).padStart(2, '0')
    ].join('-');

    return { start, end };
  }

  /**
   * The earliest selectable death date must be:
   * - within the selected quarter; and
   * - at least one day after the member's birthdate.
   */
  getMinimumDeathDateForQuarter(): string {
    const bounds = this.getQuarterDateBounds();

    if (!bounds) {
      return '';
    }

    const minimumAfterBirth = this.getMinimumDeathDate();

    return minimumAfterBirth && minimumAfterBirth > bounds.start
      ? minimumAfterBirth
      : bounds.start;
  }

  /**
   * The latest selectable death date must be within the quarter
   * and cannot be later than today.
   */
  getMaximumDeathDate(): string {
    const bounds = this.getQuarterDateBounds();

    if (!bounds) {
      return this.today;
    }

    return bounds.end < this.today
      ? bounds.end
      : this.today;
  }

  /**
   * Check if the selected quarter has at least one valid date.
   */
  get hasValidDeathDateRange(): boolean {
    if (!this.death.quarter) {
      return false;
    }

    return (
      this.getMinimumDeathDateForQuarter() <=
      this.getMaximumDeathDate()
    );
  }

  /**
   * Check whether a date belongs to the selected quarter and year.
   */
  private isDateWithinSelectedQuarter(value: string): boolean {
    const bounds = this.getQuarterDateBounds();

    return !!bounds &&
      this.isValidDate(value) &&
      value >= bounds.start &&
      value <= bounds.end;
  }

  /**
   * Update the selected quarter and remove an incompatible death date.
   */
  onQuarterChange(quarter: string): void {
    this.death.quarter = quarter;
    this.deathDateError = '';

    if (!this.death.date_of_death) {
      return;
    }

    if (!this.isDateWithinSelectedQuarter(this.death.date_of_death)) {
      this.death.date_of_death = '';
      this.deathDateError =
        `The selected date was cleared because it does not belong to ${quarter} of ${this.deathDateYear}.`;
      return;
    }

    this.validateDeathDate();
  }

  /**
   * Validate a date entered or selected in the Date of Death field.
   */
  validateDeathDate(): void {
    this.deathDateError = '';

    const dateOfDeath = this.death.date_of_death;

    if (!dateOfDeath) {
      return;
    }

    if (!this.isValidDate(dateOfDeath)) {
      this.death.date_of_death = '';
      this.deathDateError = 'Please enter a valid date of death.';
      return;
    }

    if (!this.death.quarter) {
      this.death.date_of_death = '';
      this.deathDateError = 'Please select a quarter before selecting the date of death.';
      return;
    }

    if (!this.isDateWithinSelectedQuarter(dateOfDeath)) {
      this.death.date_of_death = '';
      this.deathDateError =
        `Date of Death must fall within ${this.death.quarter} of ${this.deathDateYear}.`;
      return;
    }

    const minimumDate = this.getMinimumDeathDate();

    if (minimumDate && dateOfDeath < minimumDate) {
      this.death.date_of_death = '';
      this.deathDateError =
        'Date of Death must be at least one day after the birthdate.';
      return;
    }

    if (dateOfDeath > this.today) {
      this.death.date_of_death = '';
      this.deathDateError = 'Date of Death cannot be later than today.';
      return;
    }

    if (!this.hasValidDeathDateRange) {
      this.death.date_of_death = '';
      this.deathDateError =
        'There is no valid date available within the selected quarter.';
    }
  }

  /**
   * Calculate age on date of death.
   */
  calculateAgeAtDeath(
    birthdate: string,
    dateOfDeath: string
  ): number | string {

    if (!birthdate || !dateOfDeath) {
      return '';
    }

    const birth = birthdate.substring(0, 10);
    const death = dateOfDeath.substring(0, 10);

    if (
      !this.isValidDate(birth) ||
      !this.isValidDate(death) ||
      death <= birth
    ) {
      return '';
    }

    const [birthYear, birthMonth, birthDay] =
      birth.split('-').map(Number);

    const [deathYear, deathMonth, deathDay] =
      death.split('-').map(Number);

    let age = deathYear - birthYear;

    if (
      deathMonth < birthMonth ||
      (
        deathMonth === birthMonth &&
        deathDay < birthDay
      )
    ) {
      age--;
    }

    return age;
  }

  /**
   * Calculate displayed age for either entry mode.
   */
  getAgeAtDeath(): number | string {
    return this.calculateAgeAtDeath(
      this.getDeathBirthdate(),
      this.death.date_of_death
    );
  }

  /* ==========================================
     SEARCHABLE BAPTIZED MEMBER DROPDOWN
  ========================================== */

  /**
   * Return members in the current user's district
   * who do not already have a death record.
   */
  get availableBaptisms(): Baptism[] {
    const deceasedIds = new Set(
      this.deaths
        .filter(record => record.baptism_id !== null)
        .map(record => Number(record.baptism_id))
    );

    const districtChurchIds = new Set(
      this.churches.map(church => Number(church.church_id))
    );

    return this.baptisms.filter(baptism =>
      districtChurchIds.has(Number(baptism.church_id)) &&
      !deceasedIds.has(Number(baptism.baptism_id))
    );
  }

  /**
   * Filter available members by name.
   */
  get filteredAvailableBaptisms(): Baptism[] {
    const search = this.baptismSearch.trim().toLowerCase();

    return this.availableBaptisms.filter(baptism =>
      this.getFullName(baptism)
        .toLowerCase()
        .includes(search)
    );
  }

  /**
   * Display selected member's full name.
   */
  getSelectedBaptismName(): string {
    return this.selectedBaptism
      ? this.getFullName(this.selectedBaptism)
      : '';
  }

  /**
   * Compare member IDs safely.
   */
  sameBaptism(
    id1: number | null | undefined,
    id2: number | null | undefined
  ): boolean {
    return (
      id1 !== null &&
      id1 !== undefined &&
      id2 !== null &&
      id2 !== undefined &&
      String(id1) === String(id2)
    );
  }

  /**
   * Open dropdown when search input receives focus.
   */
  openBaptismDropdown(): void {
    if (
      this.loadingBaptisms ||
      this.loadingDeaths ||
      this.churchesLoading ||
      this.deathLoadError ||
      this.availableBaptisms.length === 0
    ) {
      return;
    }

    if (!this.memberDropdownOpen) {
      this.baptismSearch = '';
      this.memberDropdownOpen = true;
    }
  }

  /**
   * Filter members as the user types.
   */
  onBaptismSearch(event: Event): void {
    this.baptismSearch =
      (event.target as HTMLInputElement).value;

    this.memberDropdownOpen = true;
  }

  /**
   * Toggle dropdown arrow.
   */
  toggleBaptismDropdown(): void {
    if (this.memberDropdownOpen) {
      this.closeBaptismDropdown();
      return;
    }

    if (
      !this.loadingBaptisms &&
      !this.loadingDeaths &&
      !this.churchesLoading &&
      !this.deathLoadError &&
      this.availableBaptisms.length > 0
    ) {
      this.baptismSearch = '';
      this.memberDropdownOpen = true;
    }
  }

  /**
   * Select a member.
   */
  chooseBaptism(baptism: Baptism): void {
    this.selectBaptism(baptism.baptism_id);
    this.closeBaptismDropdown();
  }

  /**
   * Close dropdown when clicking outside it.
   */
  @HostListener('document:click', ['$event'])
  onMemberDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (
      target &&
      this.memberDropdownOpen &&
      !this.memberDropdown?.nativeElement.contains(target)
    ) {
      this.closeBaptismDropdown();
    }
  }

  /**
   * Close dropdown and clear search text.
   */
  closeBaptismDropdown(): void {
    this.memberDropdownOpen = false;
    this.baptismSearch = '';
  }

  /* ==========================================
     DUPLICATE DEATH VALIDATION
  ========================================== */

  /**
   * Check whether a member already has a death record.
   */
  isAlreadyDeceased(baptismId: number | null): boolean {
    if (baptismId === null) {
      return false;
    }

    return this.deaths.some(
      record =>
        record.baptism_id !== null &&
        Number(record.baptism_id) === Number(baptismId)
    );
  }

  /**
   * Normalize text for duplicate comparison.
   */
  private normalizeText(value: string | null | undefined): string {
    return String(value ?? '')
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Check whether a manually entered new death record already exists
   * in the Baptism table using first, middle, and last name only.
   *
   * A blank or NULL middle name is treated as the same value.
   */
  private isExistingBaptismName(): boolean {
    const firstName = this.normalizeText(this.death.first_name);
    const middleName = this.normalizeText(this.death.middle_name);
    const lastName = this.normalizeText(this.death.last_name);

    if (!firstName || !lastName) {
      return false;
    }

    return this.baptisms.some(baptism =>
      this.normalizeText(baptism.first_name) === firstName &&
      this.normalizeText(baptism.middle_name) === middleName &&
      this.normalizeText(baptism.last_name) === lastName
    );
  }

  /**
   * Check duplicate manually entered death records.
   */
  private isDuplicateNewDeath(): boolean {
    return this.deaths.some(record => {

      const person = record.baptism ?? record;

      const sameFirstName =
        this.normalizeText(person.first_name) ===
        this.normalizeText(this.death.first_name);

      const sameMiddleName =
        this.normalizeText(person.middle_name) ===
        this.normalizeText(this.death.middle_name);

      const sameLastName =
        this.normalizeText(person.last_name) ===
        this.normalizeText(this.death.last_name);

      const sameExtension =
        this.normalizeText(person.extension_name) ===
        this.normalizeText(this.death.extension_name);

      const sameBirthdate =
        String(person.birthdate ?? '').substring(0, 10) ===
        String(this.death.birthdate).substring(0, 10);

      const sameChurch =
        Number(person.church_id) ===
        Number(this.death.church_id);

      return (
        sameFirstName &&
        sameMiddleName &&
        sameLastName &&
        sameExtension &&
        sameBirthdate &&
        sameChurch
      );
    });
  }

  /* ==========================================
     LOAD RECORDS
  ========================================== */

  /**
   * Load baptism records.
   * These records must be verified before either death-entry mode can save,
   * because manual death entries must be checked against the Baptism table.
   */
  loadBaptisms(): void {
    this.loadingBaptisms = true;
    this.baptismLoadError = false;

    this.http
      .get<any>('/api/baptisms')
      .subscribe({

        next: (response) => {
          const data = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response?.data?.data)
                ? response.data.data
                : null;

          this.loadingBaptisms = false;

          if (!data) {
            this.baptisms = [];
            this.baptismLoadError = true;

            showAppAlert({
              icon: 'error',
              title: 'Unable to Verify Baptism Records',
              text: 'The existing baptism records could not be read. No new death record can be saved until the records are verified.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#176b52',
              customClass: this.swalCustomClass
            });

            return;
          }

          this.baptisms = data;
          this.baptismLoadError = false;

          console.log('Baptism records loaded:', this.baptisms);
        },

        error: (error) => {
          console.error('Failed to load baptism records:', error);

          this.baptisms = [];
          this.loadingBaptisms = false;
          this.baptismLoadError = true;

          showAppAlert({
            icon: 'error',
            title: 'Unable to Verify Baptism Records',
            text: 'Existing baptism records could not be loaded. A new death record cannot be added until the Baptism table has been checked. Please refresh the page and try again.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#176b52',
            customClass: this.swalCustomClass
          });
        }
      });
  }

  /**
   * Load existing death records for duplicate checking.
   */
  loadDeaths(): void {
    this.loadingDeaths = true;
    this.deathLoadError = false;

    this.http
      .get<any>('/api/deaths')
      .subscribe({

        next: (response) => {
          const data = response?.data ?? response;

          this.deaths = Array.isArray(data) ? data : [];
          this.loadingDeaths = false;

          if (this.isAlreadyDeceased(this.death.baptism_id)) {
            this.death.baptism_id = null;
            this.selectedBaptism = null;
            this.death.date_of_death = '';
            this.closeBaptismDropdown();
          }

          console.log('Existing death records loaded:', this.deaths);
        },

        error: (error) => {
          console.error('Failed to load death records:', error);

          this.deaths = [];
          this.loadingDeaths = false;
          this.deathLoadError = true;

          this.closeBaptismDropdown();

          showAppAlert({
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
   * Load only churches assigned to the signed-in
   * pastor's district.
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

          // Keep only churches assigned to this district.
          this.churches = (response.data ?? [])
            .filter(
              church => Number(church.parent_id) === districtId
            )
            .map(church => ({
              church_id: Number(church.church_id),
              name: church.name ?? '',
              address: church.address ?? '',
              parent_id: church.parent_id === null
                ? null
                : Number(church.parent_id)
            }));

          this.churchesLoading = false;

          console.log('District churches loaded:', this.churches);
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

  /* ==========================================
     MEMBER SELECTION
  ========================================== */

  /**
   * Select a member who has not already been recorded as deceased.
   */
  selectBaptism(baptismId: number | null): void {

    if (baptismId === null || baptismId === undefined) {
      this.selectedBaptism = null;
      this.death.baptism_id = null;
      this.death.date_of_death = '';
      return;
    }

    const selectedId = Number(baptismId);

    if (this.isAlreadyDeceased(selectedId)) {
      this.death.baptism_id = null;
      this.selectedBaptism = null;
      this.death.date_of_death = '';

      showAppAlert({
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
      this.death.date_of_death = '';
      return;
    }

    if (
      this.death.date_of_death &&
      this.death.date_of_death <=
        this.selectedBaptism.birthdate.substring(0, 10)
    ) {
      this.death.date_of_death = '';
    }

    console.log('Selected baptism:', this.selectedBaptism);
  }

  /* ==========================================
     MEMBER AND CHURCH HELPERS
  ========================================== */

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
  getChurchName(churchId: number | undefined | null): string {
    if (churchId === undefined || churchId === null) {
      return '';
    }

    const church = this.churches.find(
      item => Number(item.church_id) === Number(churchId)
    );

    return church ? church.name : 'Unknown Church';
  }

  /* ==========================================
     FORM VALIDATION
  ========================================== */

  /**
   * Validate the selected person's information.
   */
  private validateDeathForm(): string[] {
    const errors: string[] = [];

    const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    if (!validQuarters.includes(this.death.quarter)) {
      errors.push('Please select a valid quarter.');
    }

    if (!this.death.date_of_death) {
      errors.push('Date of Death is required.');
    } else if (!this.isValidDate(this.death.date_of_death)) {
      errors.push('Please enter a valid date of death.');
    } else {
      if (!this.isDateWithinSelectedQuarter(this.death.date_of_death)) {
        errors.push(
          `Date of Death must fall within ${this.death.quarter} of ${this.deathDateYear}.`
        );
      }

      if (this.death.date_of_death > this.today) {
        errors.push('Date of Death cannot be later than today.');
      }

      if (!this.hasValidDeathDateRange) {
        errors.push(
          'There is no valid date available within the selected quarter based on the birthdate and today.'
        );
      }
    }

    const birthdate = this.getDeathBirthdate();

    if (this.entryMode === 'baptized') {

      if (!this.selectedBaptism || !this.death.baptism_id) {
        errors.push('Please select a baptized member.');
      } else if (
        !this.churches.some(
          church => Number(church.church_id) === Number(this.selectedBaptism?.church_id)
        )
      ) {
        errors.push('The selected member does not belong to your assigned district.');
      }

    } else {

      const namePattern =
        /^[A-Za-zÀ-ÖØ-öø-ÿÑñ][A-Za-zÀ-ÖØ-öø-ÿÑñ .'-]*$/;

      const extensionPattern =
        /^[A-Za-z0-9][A-Za-z0-9 .'-]*$/;

      if (!this.death.first_name.trim()) {
        errors.push('First Name is required.');
      } else if (!namePattern.test(this.death.first_name.trim())) {
        errors.push('Please enter a valid First Name.');
      }

      if (
        this.death.middle_name.trim() &&
        !namePattern.test(this.death.middle_name.trim())
      ) {
        errors.push('Please enter a valid Middle Name.');
      }

      if (!this.death.last_name.trim()) {
        errors.push('Last Name is required.');
      } else if (!namePattern.test(this.death.last_name.trim())) {
        errors.push('Please enter a valid Last Name.');
      }

      // Do not allow manual death entry when the same person is already
      // registered in the Baptism table. Use Existing Baptism Record instead.
      if (
        this.death.first_name.trim() &&
        this.death.last_name.trim() &&
        this.isExistingBaptismName()
      ) {
        errors.push(
          'A member with the same first name, middle name, and last name already exists in the Baptism records. Select Existing Baptism Record instead.'
        );
      }

      if (
        this.death.extension_name.trim() &&
        !extensionPattern.test(this.death.extension_name.trim())
      ) {
        errors.push('Please enter a valid Extension Name.');
      }

      const validChurch = this.churches.some(
        church => Number(church.church_id) === Number(this.death.church_id)
      );

      if (!this.death.church_id || !validChurch) {
        errors.push('Please select a valid church assigned to your district.');
      }

      if (!this.death.birthdate) {
        errors.push('Birthdate is required.');
      } else if (!this.isValidDate(this.death.birthdate)) {
        errors.push('Please enter a valid birthdate.');
      } else if (this.death.birthdate > this.today) {
        errors.push('Birthdate cannot be later than today.');
      }

      if (
        this.death.gender !== 'Male' &&
        this.death.gender !== 'Female'
      ) {
        errors.push('Please select a valid gender.');
      }

      const validCivilStatuses = [
        'Single',
        'Married',
        'Widowed'
      ];

      if (
        !this.death.marital_status ||
        !validCivilStatuses.includes(this.death.marital_status)
      ) {
        errors.push('Please select a valid civil status.');
      }
    }

    if (
      this.death.date_of_death &&
      this.isValidDate(this.death.date_of_death) &&
      birthdate &&
      this.isValidDate(birthdate) &&
      this.death.date_of_death <= birthdate
    ) {
      errors.push(
        'Date of Death must be at least one day after the birthdate.'
      );
    }

    return errors;
  }

  /* ==========================================
     SAVE DEATH RECORD
  ========================================== */

  /**
   * Save a death record for either an existing
   * baptism member or a manually entered person.
   */
  saveDeath(): void {

    if (this.saving) {
      return;
    }

    // Existing death records must be loaded first.
    if (this.loadingDeaths || this.deathLoadError) {
      showAppAlert({
        icon: 'warning',
        title: 'Records Not Ready',
        text: 'Please wait until existing death records have been loaded and verified.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Baptism records must be loaded successfully for both modes.
    // Manual entries are checked against the Baptism table by member name.
    if (this.loadingBaptisms || this.baptismLoadError) {
      showAppAlert({
        icon: 'warning',
        title: 'Baptism Records Not Verified',
        text: 'Please wait until the existing baptism records have been loaded and verified. A new death record cannot be saved without checking for an existing member.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Church records must be loaded before manual entry.
    if (this.churchesLoading || this.churches.length === 0) {
      showAppAlert({
        icon: 'warning',
        title: 'Churches Not Available',
        text: 'Your district churches could not be loaded. Please try again.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    // Validate user inputs.
    const validationErrors = this.validateDeathForm();

    if (validationErrors.length > 0) {
      showAppAlert({
        icon: 'warning',
        title: 'Please Check Your Information',
        text: validationErrors.join('\n'),
        confirmButtonText: 'OK',
        confirmButtonColor: '#176b52',
        customClass: this.swalCustomClass
      });

      return;
    }

    let payload: any;

    if (this.entryMode === 'baptized') {

      // EXISTING BAPTISM RECORD
      const baptismId = Number(this.death.baptism_id);

      if (
        !Number.isInteger(baptismId) ||
        baptismId <= 0 ||
        !this.selectedBaptism
      ) {
        showAppAlert({
          icon: 'error',
          title: 'Invalid Selection',
          text: 'Please select a valid baptized member.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#176b52',
          customClass: this.swalCustomClass
        });

        return;
      }

      if (this.isAlreadyDeceased(baptismId)) {
        showAppAlert({
          icon: 'warning',
          title: 'Death Record Already Exists',
          text: 'This member already has a death record.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#176b52',
          customClass: this.swalCustomClass
        });

        return;
      }

      payload = {
        baptism_id: baptismId,
        quarter: this.death.quarter.trim(),
        date_of_death: this.death.date_of_death
      };

    } else {

      // NEW DEATH RECORD WITHOUT BAPTISM
      if (this.isExistingBaptismName()) {
        showAppAlert({
          icon: 'warning',
          title: 'Member Already Exists in Baptism Records',
          text: 'A member with the same first name, middle name, and last name already exists in the Baptism table. Select Existing Baptism Record instead of adding a new death record.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#176b52',
          customClass: this.swalCustomClass
        });

        return;
      }

      if (this.isDuplicateNewDeath()) {
        showAppAlert({
          icon: 'error',
          title: 'Duplicate Death Record',
          text: 'A death record already exists for this person with the same name, birthdate, and church.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#176b52',
          customClass: this.swalCustomClass
        });

        return;
      }

      payload = {
        baptism_id: null,

        first_name: this.death.first_name.trim(),
        middle_name: this.death.middle_name.trim() || null,
        last_name: this.death.last_name.trim(),
        extension_name: this.death.extension_name.trim() || null,

        church_id: Number(this.death.church_id),
        birthdate: this.death.birthdate,
        gender: this.death.gender,
        marital_status: this.death.marital_status,

        quarter: this.death.quarter.trim(),
        date_of_death: this.death.date_of_death
      };
    }

    this.saving = true;

    console.log('Saving death record:', payload);

    this.submitDeath(payload);
  }

  /**
   * Submit death record to Laravel.
   */
  private submitDeath(payload: any): void {

    this.http
      .post<any>('/api/deaths', payload)
      .subscribe({

        next: (response) => {
          console.log('Death record saved:', response);

          this.saving = false;

          showAppAlert({
            icon: 'success',
            title: 'Saved Successfully',
            text: 'Death record has been saved successfully.',
            confirmButtonText: 'Continue',
            confirmButtonColor: '#176b52',
            allowOutsideClick: false,
            customClass: this.swalCustomClass
          }).then((result) => {
            if (result.isConfirmed) {
              this.navigateBackToDeathRecords();
            }
          });
        },

        error: (error) => {
          console.error('Death save error:', error);

          this.saving = false;

          if (
            error.status === 422 &&
            error.error?.errors?.baptism_id
          ) {
            this.loadDeaths();
          }

          const validationErrors = error.error?.errors
            ? Object.values(error.error.errors).flat().join('\n')
            : '';

          showAppAlert({
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
   * Return to the Death Record table while preserving the reporting period.
   */
  private navigateBackToDeathRecords(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const requestedQuarter = queryParams.get('quarter');
    const selectedQuarter = this.death.quarter || requestedQuarter;

    const validQuarter =
      selectedQuarter === 'Q1' ||
      selectedQuarter === 'Q2' ||
      selectedQuarter === 'Q3' ||
      selectedQuarter === 'Q4'
        ? selectedQuarter
        : null;

    this.router.navigate(['/pastor/deathbap'], {
      queryParams: {
        record: 'death',
        ...(Number.isInteger(this.deathDateYear) && this.deathDateYear > 0
          ? { year: this.deathDateYear }
          : {}),
        ...(validQuarter ? { quarter: validQuarter } : {}),
        ...(queryParams.get('annual') === 'true' ? { annual: true } : {})
      }
    });
  }

  /**
   * Cancel adding a death record.
   */
  cancelForm(): void {
    this.navigateBackToDeathRecords();
  }

}
