import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { ReportParticulars } from '../../report_p/report-particulars/report-particulars';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import {
  DepartmentReport,
  ReportComment,
  ReportQuarter
} from '../../../../core/models/report.model';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { Button } from '../../../../shared/components/button/button';
import {
  ReportPeriodSelector,
  ReportQuarterOption
} from '../../../../shared/reports/period-selector/report-period-selector';

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
  address: string;
  officiating_minister: string;
  place_of_baptism: string;
  date_of_baptism: string;
  marital_status: string;
  is_reclaimed: boolean | number | string;
}

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

interface Death {
  death_id: number;
  baptism_id: number;
  quarter: string;
  date_of_death: string;
  baptism?: Baptism | null;
}

@Component({
  selector: 'app-deathbap',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ReportParticulars,
    Button,
    ReportPeriodSelector
  ],
  templateUrl: './deathbap.html',
  host: { class: 'block min-h-full bg-[#f5f7f6]' }
})
export class DeathbapComponent implements OnInit {

  private http = inject(HttpClient);
  private churchService = inject(ChurchService);
  private reportService = inject(ReportService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  selectedRecord: 'baptism' | 'death' | 'ministerial' | 'mission' = 'baptism';

  // Year and quarter selector
  selectedYear = new Date().getFullYear();
  isAnnualView = false;

  // Search
  searchTerm = '';

  // Pagination
  readonly pageSize = 10;
  baptismPage = 1;
  deathPage = 1;

  selectedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';

  quarterOptions: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] = [
    'Q1',
    'Q2',
    'Q3',
    'Q4'
  ];

  get reportPeriodQuarters(): ReportQuarterOption[] {
    return this.quarterOptions.map((quarter, index) => ({
      quarter_id: index + 1,
      quarter,
      year: this.selectedYear
    }));
  }

  get selectedQuarterId(): number {
    return Number(this.selectedQuarter.slice(1));
  }

  churchId = 0;
  districtId = 0;
  departmentId = 0;
  isReadOnly = false;

  baptisms: Baptism[] = [];
  deaths: Death[] = [];
  churches: Church[] = [];
  churchesLoading = false;
  churchesError = '';
  comments: ReportComment[] = [];
  commentsLoading = false;
  commentsOpen = false;
  commentsError = '';
  newComment = '';
  savingComment = false;
  commentQuarterApproved = false;

  private readonly personalReports = new Map<number, DepartmentReport>();

  // Selected records for the details modals
  selectedBaptism: Baptism | null = null;
  selectedDeath: Death | null = null;

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

  baptismError = '';
  deathError = '';

  ngOnInit(): void {

    this.departmentId =
      Number(this.route.snapshot.paramMap.get('departmentId')) || 0;

    this.churchId =
      Number(this.route.snapshot.paramMap.get('churchId')) || 0;

    this.districtId =
      Number(this.route.snapshot.paramMap.get('districtId')) || 0;

    this.isReadOnly =
      this.router.url.startsWith('/assistant') ||
      this.router.url.startsWith('/director');

    if (this.departmentId === 16) {
      this.selectedRecord = 'ministerial';
    } else if (this.departmentId === 20) {
      this.selectedRecord = 'mission';
    } else if (this.departmentId === 23) {
      this.selectedRecord = 'death';
    }

    this.loadChurches();
    this.loadBaptisms();
    this.loadDeaths();

    if (this.selectedRecord === 'baptism' || this.selectedRecord === 'death') {
      this.loadLatestComment();
    }
  }

  get reportChurches(): Church[] {
    if (this.isReadOnly && this.churchId > 0) {
      return this.churches.filter(
        church => Number(church.church_id) === this.churchId
      );
    }

    if (this.selectedDepartmentId) {
      const personalChurchId = Number(this.auth.getCurrentUser()?.church_id);
      return this.churches.filter(
        church => Number(church.church_id) === personalChurchId
      );
    }

    return this.churches.filter(church => church.parent_id !== null);
  }

  get selectedDepartmentId(): 16 | 20 | null {
    if (this.selectedRecord === 'ministerial') return 16;
    if (this.selectedRecord === 'mission') return 20;
    return null;
  }

  get canComment(): boolean {
    const role = String(this.auth.getCurrentUser()?.role ?? '')
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ');

    return ['pastor', 'district pastor', 'assistant', 'administrative assistant']
      .includes(role);
  }

  get visibleComments(): ReportComment[] {
    return this.comments.filter(comment =>
      Number(comment.year) === this.selectedYear &&
      (
        this.isAnnualView ||
        this.normalizeQuarter(comment.quarter) === this.selectedQuarter
      )
    );
  }

  get commentChurchId(): number {
    return this.churchId || this.reportChurches[0]?.church_id || 0;
  }

  isOwnComment(comment: ReportComment): boolean {
    return Number(comment.commented_by) ===
      Number(this.auth.getCurrentUser()?.user_id);
  }

  openComments(): void {
    this.commentsOpen = true;
  }

  closeComments(): void {
    this.commentsOpen = false;
  }

  // =================================================
  // BAPTISM STATUS
  // =================================================

  getBaptismStatus(
    value: boolean | number | string | null | undefined
  ): string {

    const normalizedValue = String(value ?? '').trim().toLowerCase();

    const reclaimed =
      value === true ||
      value === 1 ||
      normalizedValue === '1' ||
      normalizedValue === 'true';

    return reclaimed
      ? 'Reclaimed Member'
      : 'Newly Baptized';
  }

  // =================================================
  // BAPTISM DETAILS MODAL
  // =================================================

  openBaptismModal(baptism: Baptism): void {
    this.selectedBaptism = baptism;
  }

  closeBaptismModal(): void {
    this.selectedBaptism = null;
  }

  editSelectedBaptism(): void {

    if (this.isReadOnly || !this.selectedBaptism) {
      return;
    }

    const baptismId = Number(this.selectedBaptism.baptism_id);

    if (!Number.isInteger(baptismId) || baptismId <= 0) {
      return;
    }

    this.closeBaptismModal();

    this.router.navigate([
      '/pastor/editbap',
      baptismId
    ]);
  }

  // =================================================
  // DEATH DETAILS MODAL
  // =================================================

  openDeathModal(death: Death): void {
    this.selectedDeath = death;
  }

  closeDeathModal(): void {
    this.selectedDeath = null;
  }

  // =================================================
  // YEAR AND QUARTER FILTERS
  // =================================================

  selectQuarter(
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  ): void {
    this.isAnnualView = false;
    this.selectedQuarter = quarter;
    this.resetPagination();
    this.updateCommentQuarter();
  }

  selectReportQuarter(quarter: string): void {
    const option = this.quarterOptions.find(value => value === quarter);
    if (option) {
      this.selectQuarter(option);
    }
  }

  selectAnnual(): void {
    this.isAnnualView = true;
    this.resetPagination();
    this.updateCommentQuarter();
  }

  onYearChange(value: number): void {
    if (Number.isInteger(value) && value > 0) {
      this.selectedYear = value;
      this.resetPagination();
      this.updateCommentQuarter();
    }
  }

  // =================================================
  // SEARCH AND AUTOMATIC QUARTER NAVIGATION
  // =================================================

  /**
   * Search across all loaded records, not only the selected quarter.
   * After three characters are entered, move to a matching record's year
   * and quarter if the current quarter has no matching result.
   * Press Enter to run a search with fewer than three characters.
   */
  onSearchChange(forceSearch: boolean = false): void {
    this.resetPagination();

    const query = this.searchTerm.trim();

    if (!query || (query.length < 3 && !forceSearch)) {
      return;
    }

    if (this.selectedRecord === 'baptism') {
      const matches = this.getBaptismSearchMatches(query);

      if (matches.length === 0) {
        return;
      }

      const currentQuarterHasMatch = !this.isAnnualView &&
        matches.some(record =>
          this.getYearFromDate(record.date_of_baptism) === this.selectedYear &&
          this.normalizeQuarter(record.quarter) === this.selectedQuarter
        );

      if (!currentQuarterHasMatch) {
        const match = matches[0];

        this.navigateToRecordPeriod(
          match.quarter,
          match.date_of_baptism
        );
      }

    } else if (this.selectedRecord === 'death') {
      const matches = this.getDeathSearchMatches(query);

      if (matches.length === 0) {
        return;
      }

      const currentQuarterHasMatch = !this.isAnnualView &&
        matches.some(record =>
          this.getYearFromDate(record.date_of_death) === this.selectedYear &&
          this.normalizeQuarter(record.quarter) === this.selectedQuarter
        );

      if (!currentQuarterHasMatch) {
        const match = matches[0];

        this.navigateToRecordPeriod(
          match.quarter,
          match.date_of_death
        );
      }
    }
  }

  /** Navigate to the year and quarter containing the matching record. */
  private navigateToRecordPeriod(
    quarter: string | null | undefined,
    date: string | null | undefined
  ): void {

    const year = this.getYearFromDate(date);

    if (year !== null) {
      this.selectedYear = year;
    }

    const normalizedQuarter = this.normalizeQuarter(quarter);

    const validQuarter = this.quarterOptions.find(
      option => option === normalizedQuarter
    );

    this.selectedQuarter =
      validQuarter ??
      this.getQuarterFromDate(date) ??
      this.selectedQuarter;

    this.isAnnualView = false;
    this.resetPagination();
    this.updateCommentQuarter();
    this.cdr.detectChanges();
  }

  /** Calculate the quarter from the date if the saved quarter is invalid. */
  private getQuarterFromDate(
    date: string | null | undefined
  ): 'Q1' | 'Q2' | 'Q3' | 'Q4' | null {

    if (!date) {
      return null;
    }

    const match = date.trim().match(/^\d{4}-(\d{2})-\d{2}/);

    if (!match) {
      return null;
    }

    const month = Number(match[1]);

    if (month < 1 || month > 12) {
      return null;
    }

    return `Q${Math.ceil(month / 3)}` as
      'Q1' | 'Q2' | 'Q3' | 'Q4';
  }

  get availableYears(): number[] {
    const years = new Set<number>();

    years.add(new Date().getFullYear());

    this.baptisms.forEach(record => {
      const year = this.getYearFromDate(record.date_of_baptism);

      if (year !== null) {
        years.add(year);
      }
    });

    this.deaths.forEach(record => {
      const year = this.getYearFromDate(record.date_of_death);

      if (year !== null) {
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }

  /**
   * Normalize quarter values from MariaDB.
   * Accepts Q1, 1, Quarter 1 and 1st Quarter formats.
   */
  private normalizeQuarter(
    quarter: string | null | undefined
  ): string {

    const value = (quarter ?? '')
      .trim()
      .toUpperCase();

    const match = value.match(
      /^(?:Q\s*|QUARTER\s*)?([1-4])(?:ST|ND|RD|TH)?(?:\s*QUARTER)?$/
    );

    return match ? `Q${match[1]}` : value;
  }

  private getYearFromDate(
    date: string | null | undefined
  ): number | null {

    if (!date) {
      return null;
    }

    const match = date.trim().match(/^(\d{4})-\d{2}-\d{2}/);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);

    return Number.isInteger(year) ? year : null;
  }

  // =================================================
  // DISPLAYED RECORDS
  // =================================================

  /** Filter baptism records by church, year, quarter, and search text. */
  get displayedBaptisms(): Baptism[] {

    const records = this.churchId
      ? this.baptisms.filter(
          record =>
            Number(record.church_id) === Number(this.churchId)
        )
      : this.baptisms;

    return records
      .filter(record =>
        (
          this.isAnnualView ||
          this.normalizeQuarter(record.quarter) === this.selectedQuarter
        ) &&
        this.getYearFromDate(record.date_of_baptism) === this.selectedYear
      )
      .filter(record => this.matchesSearch([
        record.baptism_id,
        this.getFullName(record),
        this.getChurchName(record.church_id),
        record.birthdate,
        this.formatDate(record.birthdate),
        record.address,
        record.date_of_baptism,
        this.formatDate(record.date_of_baptism),
        record.officiating_minister,
        record.place_of_baptism,
        record.gender,
        record.marital_status,
        record.quarter,
        record.is_reclaimed
      ]))
      .sort(
        (a, b) => Number(a.baptism_id) - Number(b.baptism_id)
      );
  }

  /** Filter death records by church, year, quarter, and search text. */
  get displayedDeaths(): Death[] {

    const records = this.churchId
      ? this.deaths.filter(
          record =>
            Number(this.getDeathBaptism(record)?.church_id) ===
            Number(this.churchId)
        )
      : this.deaths;

    return records
      .filter(record =>
        (
          this.isAnnualView ||
          this.normalizeQuarter(record.quarter) === this.selectedQuarter
        ) &&
        this.getYearFromDate(record.date_of_death) === this.selectedYear
      )
      .filter(record => {
        const baptism = this.getDeathBaptism(record);

        return this.matchesSearch([
          record.death_id,
          this.getFullName(baptism),
          this.getChurchName(baptism?.church_id),
          baptism?.birthdate,
          this.formatDate(baptism?.birthdate || ''),
          baptism?.address,
          record.date_of_death,
          this.formatDate(record.date_of_death),
          baptism?.date_of_baptism,
          this.formatDate(baptism?.date_of_baptism || ''),
          baptism?.officiating_minister,
          baptism?.place_of_baptism,
          baptism?.gender,
          baptism?.marital_status,
          record.quarter,
          this.calculateAgeAtDeath(
            baptism?.birthdate || '',
            record.date_of_death
          )
        ]);
      });
  }

  /** Find matching baptism records across all loaded years and quarters. */
  private getBaptismSearchMatches(query: string): Baptism[] {

    const records = this.churchId
      ? this.baptisms.filter(
          record => Number(record.church_id) === Number(this.churchId)
        )
      : this.baptisms;

    return records
      .filter(record => this.matchesSearch([
        record.baptism_id,
        this.getFullName(record),
        this.getChurchName(record.church_id),
        record.birthdate,
        this.formatDate(record.birthdate),
        record.address,
        record.date_of_baptism,
        this.formatDate(record.date_of_baptism),
        record.officiating_minister,
        record.place_of_baptism,
        record.gender,
        record.marital_status,
        record.quarter,
        record.is_reclaimed
      ], query))
      .sort(
        (a, b) => Number(a.baptism_id) - Number(b.baptism_id)
      );
  }

  /** Find matching death records across all loaded years and quarters. */
  private getDeathSearchMatches(query: string): Death[] {

    const records = this.churchId
      ? this.deaths.filter(
          record =>
            Number(this.getDeathBaptism(record)?.church_id) ===
            Number(this.churchId)
        )
      : this.deaths;

    return records
      .filter(record => {
        const baptism = this.getDeathBaptism(record);

        return this.matchesSearch([
          record.death_id,
          this.getFullName(baptism),
          this.getChurchName(baptism?.church_id),
          baptism?.birthdate,
          this.formatDate(baptism?.birthdate || ''),
          baptism?.address,
          record.date_of_death,
          this.formatDate(record.date_of_death),
          baptism?.date_of_baptism,
          this.formatDate(baptism?.date_of_baptism || ''),
          baptism?.officiating_minister,
          baptism?.place_of_baptism,
          baptism?.gender,
          baptism?.marital_status,
          record.quarter,
          this.calculateAgeAtDeath(
            baptism?.birthdate || '',
            record.date_of_death
          )
        ], query);
      })
      .sort((a, b) =>
        (b.date_of_death || '').localeCompare(a.date_of_death || '')
      );
  }

  /** Case-insensitive search across record fields. */
  private matchesSearch(
    values: Array<string | number | boolean | null | undefined>,
    searchText: string = this.searchTerm
  ): boolean {

    const query = searchText.trim().toLocaleLowerCase();

    if (!query) {
      return true;
    }

    return values.some(value =>
      value !== null &&
      value !== undefined &&
      String(value).toLocaleLowerCase().includes(query)
    );
  }

  // =================================================
  // TABLE PAGINATION
  // =================================================

  get paginatedBaptisms(): Baptism[] {
    const startIndex = (this.baptismPage - 1) * this.pageSize;

    return this.displayedBaptisms.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  get paginatedDeaths(): Death[] {
    const startIndex = (this.deathPage - 1) * this.pageSize;

    return this.displayedDeaths.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  get baptismTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.displayedBaptisms.length / this.pageSize)
    );
  }

  get deathTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.displayedDeaths.length / this.pageSize)
    );
  }

  get baptismStartRecord(): number {
    return this.displayedBaptisms.length === 0
      ? 0
      : ((this.baptismPage - 1) * this.pageSize) + 1;
  }

  get baptismEndRecord(): number {
    return Math.min(
      this.baptismPage * this.pageSize,
      this.displayedBaptisms.length
    );
  }

  get deathStartRecord(): number {
    return this.displayedDeaths.length === 0
      ? 0
      : ((this.deathPage - 1) * this.pageSize) + 1;
  }

  get deathEndRecord(): number {
    return Math.min(
      this.deathPage * this.pageSize,
      this.displayedDeaths.length
    );
  }

  get baptismPageNumbers(): number[] {
    return this.getVisiblePageNumbers(
      this.baptismPage,
      this.baptismTotalPages
    );
  }

  get deathPageNumbers(): number[] {
    return this.getVisiblePageNumbers(
      this.deathPage,
      this.deathTotalPages
    );
  }

  private getVisiblePageNumbers(
    currentPage: number,
    totalPages: number
  ): number[] {

    const visiblePageCount = 5;

    let startPage = Math.max(
      1,
      currentPage - Math.floor(visiblePageCount / 2)
    );

    let endPage = Math.min(
      totalPages,
      startPage + visiblePageCount - 1
    );

    startPage = Math.max(
      1,
      endPage - visiblePageCount + 1
    );

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }

  setBaptismPage(page: number): void {
    this.baptismPage = Math.min(
      Math.max(1, page),
      this.baptismTotalPages
    );
  }

  setDeathPage(page: number): void {
    this.deathPage = Math.min(
      Math.max(1, page),
      this.deathTotalPages
    );
  }

  private resetPagination(): void {
    this.baptismPage = 1;
    this.deathPage = 1;
  }

  // =================================================
  // REPORT NAVIGATION
  // =================================================

  get reportLocation(): string {

    const churchName = this.getChurchName(this.churchId);
    const districtName = this.getChurchName(this.districtId);

    return [
      churchName,
      districtName !== 'Unknown Church' ? districtName : ''
    ]
      .filter(Boolean)
      .join(' · ');
  }

  backToReports(): void {

    if (!this.isReadOnly) {
      return;
    }

    this.router.navigate([
      `${this.router.url.startsWith('/assistant') ? '/assistant' : '/director'}/reports/programs`,
      this.districtId,
      this.churchId
    ]);
  }

  selectRecord(
    record: 'baptism' | 'death' | 'ministerial' | 'mission'
  ): void {

    this.selectedRecord = record;
    this.searchTerm = '';
    this.resetPagination();

    this.closeBaptismModal();
    this.closeDeathModal();

    if (record === 'baptism') {
      this.loadBaptisms();
      this.loadLatestComment();
    } else if (record === 'death') {
      this.comments = [];
      this.commentQuarterApproved = false;
      this.loadLatestComment();
    } else {
      this.commentsOpen = false;
    }
  }

  // =================================================
  // COMMENTS
  // =================================================

  private loadLatestComment(): void {

    if (
      this.selectedRecord !== 'baptism' &&
      this.selectedRecord !== 'death'
    ) {
      return;
    }

    const departmentId = this.selectedRecord === 'baptism' ? 22 : 23;

    const churchIds = this.churchId
      ? [this.churchId]
      : this.reportChurches.map(church => church.church_id);

    this.comments = [];
    this.commentsError = '';
    this.commentQuarterApproved = false;

    if (churchIds.length === 0) {
      this.commentsLoading = false;
      return;
    }

    this.commentsLoading = true;

    forkJoin(churchIds.map(churchId =>
      this.reportService.getDepartmentComments(churchId, departmentId)
    )).subscribe({
      next: responses => {

        this.comments = responses.flatMap(response =>
          Array.isArray(response) ? response : response.data ?? []
        );

        this.commentsLoading = false;
        this.cdr.detectChanges();
      },

      error: error => {

        this.commentsError =
          error?.error?.message || 'Unable to load comments.';

        this.commentsLoading = false;
        this.cdr.detectChanges();
      }
    });

    const commentChurchId = this.commentChurchId;
    if (commentChurchId > 0) {

      const cachedReport = this.personalReports.get(departmentId);

      if (cachedReport) {
        this.updateCommentQuarter(cachedReport);
        return;
      }

      this.reportService.getDepartmentReport(
        commentChurchId,
        departmentId
      ).subscribe({
        next: report => {

          this.personalReports.set(departmentId, report);
          this.updateCommentQuarter(report);
          this.cdr.detectChanges();
        },

        error: error => {

          this.commentsError =
            error?.error?.message ||
            'Unable to load report quarter for comments.';

          this.cdr.detectChanges();
        }
      });
    }
  }

  private updateCommentQuarter(
    report = this.personalReports.get(
      this.selectedRecord === 'baptism' ? 22 : 23
    )
  ): void {

    this.commentQuarterApproved = false;

    if (!report) {
      return;
    }

    const quarters: ReportQuarter[] = report.programs.flatMap(program =>
      program.sections.flatMap(section =>
        section.particulars.flatMap(particular => particular.quarters)
      )
    ).filter(quarter =>
      Number(quarter.year) === this.selectedYear &&
      this.normalizeQuarter(quarter.quarter) === this.selectedQuarter
    );

    this.commentQuarterApproved =
      quarters.length > 0 &&
      quarters.every(quarter => Boolean(quarter.mission_approve));
  }

  publishComment(): void {

    const details = this.newComment.trim();
    const departmentId = this.selectedRecord === 'baptism' ? 22 : 23;
    const churchId = this.commentChurchId;

    if (
      !details ||
      this.savingComment ||
      !this.canComment ||
      !churchId
    ) {
      return;
    }

    if (details.length > 255) {
      this.commentsError = 'Comments must not exceed 255 characters.';
      return;
    }

    if (this.isAnnualView) {
      this.commentsError = 'Select a quarter to add a comment.';
      return;
    }

    if (this.commentQuarterApproved) {
      this.commentsError = 'This report has been approved. Comments are closed.';
      return;
    }

    this.savingComment = true;
    this.commentsError = '';

    this.reportService
      .addPersonalReportComment(
        churchId,
        departmentId,
        this.selectedYear,
        this.selectedQuarter,
        details
      )
      .subscribe({
        next: response => {

          this.comments.unshift(response.data);
          this.newComment = '';
          this.savingComment = false;
          this.cdr.detectChanges();
        },

        error: error => {

          this.savingComment = false;

          this.commentsError =
            error?.error?.message || 'Unable to save comment.';

          this.cdr.detectChanges();
        }
      });
  }

  // =================================================
  // LOAD BAPTISM RECORDS
  // =================================================

  loadBaptisms(): void {

    this.loadingBaptisms = true;
    this.baptismError = '';

    console.log('Loading baptism records...');

    this.http
      .get<any>('http://127.0.0.1:8000/api/baptisms')
      .pipe(
        timeout(10000),
        finalize(() => {

          this.loadingBaptisms = false;

          console.log('Finished loading baptism records.');

          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {

          console.log('Baptism API response:', response);

          const data = response?.data ?? response;

          if (Array.isArray(data)) {

            this.baptisms = data;
            this.baptismPage = 1;

            console.log('Baptism records loaded:', this.baptisms);

          } else {

            this.baptisms = [];

            this.baptismError =
              'The server returned an invalid baptism record response.';
          }
        },

        error: error => {

          console.error('Failed to load baptism records:', error);

          this.baptisms = [];

          if (
            error?.name === 'TimeoutError' ||
            error?.message?.includes('timeout')
          ) {

            this.baptismError =
              'The Laravel server took too long to respond.';

          } else if (error?.status === 0) {

            this.baptismError =
              'Cannot connect to Laravel. Make sure php artisan serve is running and CORS is configured.';

          } else if (error?.status === 404) {

            this.baptismError =
              'The baptism API endpoint was not found.';

          } else if (error?.error?.message) {

            this.baptismError = error.error.message;

          } else {

            this.baptismError = 'Failed to load baptism records.';
          }
        }
      });
  }

  // =================================================
  // LOAD DEATH RECORDS
  // =================================================

  loadDeaths(): void {

    this.loadingDeaths = true;
    this.deathError = '';

    console.log('Loading death records...');

    this.http
      .get<any>('http://127.0.0.1:8000/api/deaths')
      .pipe(
        timeout(10000),
        finalize(() => {

          this.loadingDeaths = false;

          console.log('Finished loading death records.');

          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {

          console.log('Death API response:', response);

          const data = response?.data ?? response;

          if (Array.isArray(data)) {

            this.deaths = data;
            this.deathPage = 1;

            console.log('Death records loaded:', this.deaths);

          } else {

            this.deaths = [];

            this.deathError =
              'The server returned an invalid death record response.';
          }
        },

        error: error => {

          console.error('Failed to load death records:', error);

          this.deaths = [];

          if (
            error?.name === 'TimeoutError' ||
            error?.message?.includes('timeout')
          ) {

            this.deathError =
              'The Laravel server took too long to respond.';

          } else if (error?.status === 0) {

            this.deathError =
              'Cannot connect to Laravel. Make sure php artisan serve is running and CORS is configured.';

          } else if (error?.status === 404) {

            this.deathError =
              'The death API endpoint was not found.';

          } else if (error?.error?.message) {

            this.deathError = error.error.message;

          } else {

            this.deathError = 'Failed to load death records.';
          }
        }
      });
  }

  // =================================================
  // LOAD CHURCHES
  // =================================================

  loadChurches(): void {

    this.churchesLoading = true;
    this.churchesError = '';

    if (!this.isReadOnly) {

      this.churchService.getMyDistrictChurches().subscribe({
        next: response => {

          this.districtId =
            Number(response.district?.church_id) || this.districtId;

          this.churches = (response.data || []).map(church => ({
            church_id: Number(church.church_id),
            name: church.name || '',
            address: church.address || '',
            parent_id: church.parent_id == null
              ? null
              : Number(church.parent_id)
          }));

          this.churchesLoading = false;

          if (
            this.selectedRecord === 'baptism' ||
            this.selectedRecord === 'death'
          ) {
            this.loadLatestComment();
          }

          this.cdr.detectChanges();
        },

        error: error => {

          console.error('Failed to load district churches:', error);

          this.churches = [];
          this.churchesLoading = false;

          this.churchesError =
            error?.error?.message || 'Unable to load churches for this report.';

          this.comments = [];

          this.cdr.detectChanges();
        }
      });

      return;
    }

    console.log('Loading churches...');

    this.http
      .get<any>('http://127.0.0.1:8000/api/churches')
      .subscribe({
        next: response => {

          console.log('Church API response:', response);

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

          console.log('Churches loaded:', this.churches);

          this.churchesLoading = false;
          this.cdr.detectChanges();
        },

        error: error => {

          console.error('Failed to load churches:', error);

          this.churches = [];
          this.churchesLoading = false;

          this.churchesError =
            error?.error?.message || 'Unable to load churches for this report.';

          this.cdr.detectChanges();
        }
      });
  }

  // =================================================
  // CHURCH AND MEMBER HELPERS
  // =================================================

  getChurchName(
    churchId: number | null | undefined
  ): string {

    if (churchId === null || churchId === undefined) {
      return 'Unknown Church';
    }

    const church = this.churches.find(
      item => Number(item.church_id) === Number(churchId)
    );

    return church ? church.name : 'Unknown Church';
  }

  getBaptismById(
    baptismId: number
  ): Baptism | null {

    const baptism = this.baptisms.find(
      item => Number(item.baptism_id) === Number(baptismId)
    );

    return baptism ?? null;
  }

  /** Get the baptism associated with a death. */
  getDeathBaptism(
    death: Death
  ): Baptism | null {

    if (death.baptism) {
      return death.baptism;
    }

    return this.getBaptismById(death.baptism_id);
  }

  /** Build the full member name. */
  getFullName(
    baptism: Baptism | null | undefined
  ): string {

    if (!baptism) {
      return 'Unknown Member';
    }

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

  // =================================================
  // DATE HELPERS
  // =================================================

  formatDate(date: string): string {

    if (!date) {
      return '—';
    }

    const parsedDate =
      new Date(date.substring(0, 10) + 'T00:00:00');

    if (isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  calculateAge(
    birthdate: string
  ): number | string {

    if (!birthdate) {
      return '—';
    }

    const birthDate =
      new Date(birthdate.substring(0, 10) + 'T00:00:00');

    if (isNaN(birthDate.getTime())) {
      return '—';
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

  calculateAgeAtDeath(
    birthdate: string,
    dateOfDeath: string
  ): number | string {

    if (!birthdate || !dateOfDeath) {
      return '—';
    }

    const birthDate =
      new Date(birthdate.substring(0, 10) + 'T00:00:00');

    const deathDate =
      new Date(dateOfDeath.substring(0, 10) + 'T00:00:00');

    if (
      isNaN(birthDate.getTime()) ||
      isNaN(deathDate.getTime()) ||
      deathDate < birthDate
    ) {
      return '—';
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

}