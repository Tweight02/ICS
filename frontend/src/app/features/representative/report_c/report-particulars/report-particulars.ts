import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  inject,
  NgZone,
  signal,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportService } from '../../../../core/services/report/report';
import { CommentReadStateService } from '../../../../core/services/report/comment-read-state';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import Swal from 'sweetalert2';

interface QuarterRecord {
  quarter_id: number;
  quarter?: string;
  year?: number | string;
  value: number | string | null;
  date_submitted?: string | null;
  district_endorse?: string | null;
  mission_approve: string | null;
}

interface Quarter {
  quarter_id: number;
  quarter: string;
  year: number;
}

interface Particular {
  particular_id: number;
  particular_name: string;
  quarters: QuarterRecord[];
}

interface Section {
  program_id?: number;
  program_name?: string;
  section_name?: string;
  particulars: Particular[];
}

interface Program {
  program_id: number;
  program_name: string;
  sections: Section[];
}

interface Report {
  department?: { department_name?: string };
  programs: Program[];
}

interface SaveReportItem {
  particular_id: number;
  quarter_id: number;
  value: number | null;
}

interface ReportComment {
  comment_id: number;
  quarter_id: number;
  commented_by: number;
  details: string;
  date_commented: string;
  status?: string | null; // 'commented'
  // Joined by the API (users + quarters tables)
  commenter_name?: string | null;
  commenter_role?: string | null;
  quarter?: string | null;
  year?: number | string | null;
}

interface QuarterRef {
  quarter_id: number;
  quarter?: string | null;
  year?: number | string | null;
}

type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-report-particulars',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-particulars.html'
})
export class ReportParticulars implements OnInit, OnDestroy {

  @ViewChild('commentMessages')
  private commentMessages?: ElementRef<HTMLUListElement>;

  // Add these lines here
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportService = inject(ReportService);
  private readonly commentReadState = inject(CommentReadStateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly auth = inject(AuthService);
  private readonly churchService = inject(ChurchService);

  churchId = 0;

  departmentId = 0;
  report: Report | null = null;

  availableQuarters: Quarter[] = [];
  availableYears: number[] = [];

  selectedYear: number | null = null;
  selectedQuarterId: number | null = null;
  selectedProgramId: number | null = null;

  isAnnualView = false;
  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }

  private readonly savingState = signal(false);
  get saving(): boolean {
    return this.savingState();
  }
  set saving(value: boolean) {
    this.savingState.set(value);
  }
  errorMessage = '';

  // ---- Comments (from District Pastor & Assistant, read-only) ----
  comments: ReportComment[] = [];
  private readonly commentsLoadingState = signal(false);
  get commentsLoading(): boolean {
    return this.commentsLoadingState();
  }
  set commentsLoading(value: boolean) {
    this.commentsLoadingState.set(value);
  }
  commentsError = '';
  commentDraft = '';
  commentSubmitting = false;
  mobileCommentsOpen = false;
  private commentPollingTimer: ReturnType<typeof setInterval> | null = null;
  private commentsRequestInFlight = false;
  private readonly commentPollingIntervalMs = 5000;

  // ---- Auto-save state ----
  private readonly autoSaveStatusState = signal<AutoSaveStatus>('idle');
  get autoSaveStatus(): AutoSaveStatus {
    return this.autoSaveStatusState();
  }
  set autoSaveStatus(value: AutoSaveStatus) {
    this.autoSaveStatusState.set(value);
  }
  private readonly autoSaveDelayMs = 800;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSaving = false;
  private autoSaveQueue: SaveReportItem[] | null = null;
  private destroyed = false;


ngOnInit(): void {
  const user = this.auth.getCurrentUser();

  if (!user?.church_id) {
    this.errorMessage =
      'Your account does not have a church assigned. Please contact the administrator.';
    return;
  }

  this.route.paramMap.subscribe(params => {
    const id = Number(params.get('departmentId'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'Department ID was not provided.';
      return;
    }

    this.departmentId = id;
    this.resolveReportChurch(Number(user.church_id));
  });
}

  private resolveReportChurch(assignedChurchId: number): void {
    this.loading = true;

    this.churchService.getAllChurches().subscribe({
      next: response => {
        const churches = Array.isArray(response.data) ? response.data : [];
        const assignedChurch = churches.find(
          church => Number(church.church_id) === assignedChurchId
        );

        if (!assignedChurch) {
          this.loading = false;
          this.errorMessage = 'Your assigned church could not be found.';
          this.cdr.detectChanges();
          return;
        }

        let reportChurch = assignedChurch;

        if (assignedChurch.parent_id === null) {
          const districtChurches = churches.filter(
            church => Number(church.parent_id) === assignedChurchId
          );

          if (districtChurches.length !== 1) {
            this.loading = false;
            this.errorMessage = districtChurches.length === 0
              ? 'No local church is assigned to this district.'
              : 'Your account is assigned to a district with multiple churches. Please contact the administrator.';
            this.cdr.detectChanges();
            return;
          }

          reportChurch = districtChurches[0];
        }

        this.churchId = Number(reportChurch.church_id);
        this.loadReport();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load church information for this report.';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    // Save anything still waiting before leaving the page.
    this.flushAutoSave();
    this.stopCommentPolling();
    this.destroyed = true;
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';

    this.reportService
      .getDepartmentReport(this.churchId, this.departmentId)
      .subscribe({
        next: (response: any) => {
          this.report = (response?.data ?? response) as Report;
          this.initializeSelections();
          this.loading = false;
          this.cdr.detectChanges();
          this.loadComments();
        },
        error: (error: any) => {
          console.error(error);
          this.errorMessage =
            error?.error?.message || 'Unable to load report.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private initializeSelections(): void {
    const programs = this.report?.programs ?? [];

    if (!programs.some(p => p.program_id === this.selectedProgramId)) {
      this.selectedProgramId = programs[0]?.program_id ?? null;
    }

    const unique = new Map<string, Quarter>();

    for (const program of programs) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          for (const record of particular.quarters ?? []) {
            const year = Number(record.year);
            const number = this.quarterNumber(record.quarter ?? '');

            if (!record.quarter_id || !year || number < 1 || number > 4) {
              continue;
            }

            const key = `${year}-Q${number}`;

            if (!unique.has(key)) {
              unique.set(key, {
                quarter_id: record.quarter_id,
                quarter: `Q${number}`,
                year
              });
            }
          }
        }
      }
    }

    this.availableQuarters = [...unique.values()].sort(
      (a, b) =>
        a.year - b.year ||
        this.quarterNumber(a.quarter) - this.quarterNumber(b.quarter)
    );

    this.availableYears = [
      ...new Set(this.availableQuarters.map(q => q.year))
    ].sort((a, b) => b - a);

    if (
      this.selectedYear === null ||
      !this.availableYears.includes(this.selectedYear)
    ) {
      this.selectedYear = this.availableYears[0] ?? null;
    }

    if (
      !this.getQuartersForYear().some(
        q => q.quarter_id === this.selectedQuarterId
      )
    ) {
      this.selectedQuarterId =
        this.getQuartersForYear()[0]?.quarter_id ?? null;
    }
  }

  private quarterNumber(name: string): number {
    const match = String(name)
      .toUpperCase()
      .match(/(?:Q|QUARTER\s*)?([1-4])/);

    return match ? Number(match[1]) : 0;
  }

  getQuartersForYear(): Quarter[] {
    return this.availableQuarters.filter(
      q => q.year === this.selectedYear
    );
  }

  getVisibleQuarters(): Quarter[] {
    if (this.isAnnualView) {
      return this.getQuartersForYear();
    }

    const quarter = this.getSelectedQuarter();
    return quarter ? [quarter] : [];
  }

  getSelectedQuarter(): Quarter | null {
    const quarter = this.getQuartersForYear().find(
      q => q.quarter_id === this.selectedQuarterId
    ) ?? null;

    if (!quarter) return null;

    const program = this.getSelectedProgram();
    return program ? this.getProgramQuarter(program, quarter) ?? quarter : quarter;
  }

  selectYear(year: number): void {
    if (this.saving) return;

    this.flushAutoSave();

    this.selectedYear = Number(year);
    this.isAnnualView = false;
    this.selectedQuarterId =
      this.getQuartersForYear()[0]?.quarter_id ?? null;

    this.clearMessages();
  }

  selectQuarter(quarter: Quarter): void {
    if (this.saving) return;

    this.flushAutoSave();

    this.isAnnualView = false;
    this.selectedQuarterId = quarter.quarter_id;
    this.clearMessages();
  }

  selectAnnual(): void {
    if (this.saving) return;

    this.flushAutoSave();

    this.isAnnualView = true;
    this.clearMessages();
  }

  selectProgram(programId: number): void {
    if (this.saving) return;

    this.flushAutoSave();

    this.selectedProgramId = programId;
    this.clearMessages();
  }

  getSelectedProgram(): Program | null {
    return this.report?.programs?.find(
      p => p.program_id === this.selectedProgramId
    ) ?? null;
  }

  getParticularQuarterRecord(
    particular: Particular,
    quarter: Quarter
  ): QuarterRecord | null {
    return particular.quarters?.find(
      record => record.quarter_id === quarter.quarter_id
    ) ?? particular.quarters?.find(record =>
      this.isSameQuarter(record, quarter)
    ) ?? null;
  }

  private getProgramQuarter(program: Program, quarter: Quarter): Quarter | null {
    for (const section of program.sections ?? []) {
      for (const particular of section.particulars ?? []) {
        const record = particular.quarters?.find(item =>
          item.quarter_id === quarter.quarter_id
        ) ?? particular.quarters?.find(item =>
          this.isSameQuarter(item, quarter)
        );

        if (record) {
          return {
            quarter_id: record.quarter_id,
            quarter: record.quarter ?? quarter.quarter,
            year: Number(record.year) || quarter.year
          };
        }
      }
    }

    return null;
  }

  private isSameQuarter(record: QuarterRecord, quarter: Quarter): boolean {
    return !!record.quarter &&
      this.quarterNumber(record.quarter) === this.quarterNumber(quarter.quarter) &&
      Number(record.year) === quarter.year;
  }

  isSectionDataComplete(section: Section): boolean {
    const quarter = this.getSelectedQuarter();

    return !!quarter &&
      section.particulars.length > 0 &&
      section.particulars.every(particular => {
        const value = this.getParticularQuarterRecord(particular, quarter)?.value;
        return value !== null && value !== undefined && value !== '';
      });
  }

  isRecordApproved(record: QuarterRecord | null): boolean {
    if (!record) return false;

    return String(record.mission_approve ?? '').trim() !== '';
  }

  isQuarterApproved(quarterId: number): boolean {
    const program = this.getSelectedProgram();
    if (!program) return false;

    const particulars = program.sections.flatMap(section => section.particulars);

    return particulars.length > 0 && particulars.every(particular => {
        const record = particular.quarters.find(
          q => q.quarter_id === quarterId
        );

      return this.isRecordApproved(record ?? null);
    });
  }

  isQuarterEndorsed(quarterId: number): boolean {
    if (this.isQuarterApproved(quarterId)) return false;

    const program = this.getSelectedProgram();
    if (!program) return false;

    const records = program.sections.flatMap(section =>
      section.particulars.flatMap(particular =>
        particular.quarters.filter(record => record.quarter_id === quarterId)
      )
    );

    return records.length > 0 &&
      !records.some(record => this.isRecordApproved(record)) &&
      records.every(record => String(record.district_endorse ?? '').trim() !== '');
  }

  getQuarterValue(
    particular: Particular,
    quarter: Quarter
  ): number | string | null {
    return this.getParticularQuarterRecord(particular, quarter)?.value ?? null;
  }

  getAnnualTotal(particular: Particular): number {
    return this.getQuartersForYear().reduce((total, quarter) => {
      const value = this.getQuarterValue(particular, quarter);
      const numeric = Number(value);

      return value !== null &&
        value !== '' &&
        Number.isFinite(numeric)
        ? total + numeric
        : total;
    }, 0);
  }

  setQuarterValue(
    particular: Particular,
    quarter: Quarter,
    value: number | string | null
  ): void {
    if (
      this.saving ||
      this.isAnnualView ||
      this.isQuarterApproved(quarter.quarter_id)
    ) {
      return;
    }

    let record = particular.quarters.find(
      q => q.quarter_id === quarter.quarter_id
    ) ?? this.getParticularQuarterRecord(particular, quarter);

    if (!record) {
      const program = this.getSelectedProgram();
      const programQuarter = program
        ? this.getProgramQuarter(program, quarter)
        : null;

      if (!programQuarter) {
        this.errorMessage = 'This report quarter is unavailable.';
        return;
      }

      record = {
        quarter_id: programQuarter.quarter_id,
        quarter: quarter.quarter,
        year: quarter.year,
        value: null,
        mission_approve: null
      };

      particular.quarters.push(record);
    }

    if (value === '' || value === null) {
      record.value = null;
      this.clearMessages();
      this.scheduleAutoSave();
      return;
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      this.errorMessage = 'Enter a valid non-negative number.';
      return;
    }

    record.value = numeric;
    this.clearMessages();
    this.scheduleAutoSave();
  }

  // ------------------------------------------------------------------
  // Comments (display only) + status
  // ------------------------------------------------------------------

  loadComments(silent = false): void {
    if (this.commentsRequestInFlight) return;

    this.commentsRequestInFlight = true;
    if (!silent) {
      this.commentsLoading = true;
      this.commentsError = '';
    }

    const previousVisibleIds = new Set(
      this.getVisibleComments().map(comment => comment.comment_id)
    );
    const wasNearBottom = this.isCommentListNearBottom();

    this.reportService
      .getDepartmentComments(this.churchId, this.departmentId)
      .subscribe({
        next: (response: any) => {
          const list = response?.data ?? response;
          const nextComments: ReportComment[] = Array.isArray(list) ? list : [];
          const hasNewVisibleComment = nextComments.some(comment =>
            !previousVisibleIds.has(comment.comment_id) &&
            this.getVisibleQuarters().some(quarter =>
              this.matchesQuarter(comment, quarter)
            )
          );

          this.comments = nextComments;
          this.commentsLoading = false;
          this.commentsError = '';
          this.commentsRequestInFlight = false;
          if (this.mobileCommentsOpen && hasNewVisibleComment && wasNearBottom) {
            this.markVisibleCommentsRead();
          }
          this.refreshView();
          if (this.mobileCommentsOpen && hasNewVisibleComment && wasNearBottom) {
            this.scrollCommentMessagesToLatest();
          }
          this.startCommentPolling();
        },
        error: (error: any) => {
          this.commentsRequestInFlight = false;
          if (!silent) {
            console.error(error);
            this.commentsError =
              error?.error?.message || 'Unable to load comments.';
            this.commentsLoading = false;
            this.refreshView();
          }
          this.startCommentPolling();
        }
      });
  }

  private startCommentPolling(): void {
    if (this.commentPollingTimer || this.destroyed) return;

    this.commentPollingTimer = this.ngZone.runOutsideAngular(() =>
      setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          this.loadComments(true);
        }
      }, this.commentPollingIntervalMs)
    );
  }

  private stopCommentPolling(): void {
    if (!this.commentPollingTimer) return;

    clearInterval(this.commentPollingTimer);
    this.commentPollingTimer = null;
  }

  onCommentMessagesScroll(): void {
    if (
      this.mobileCommentsOpen &&
      this.isCommentListNearBottom() &&
      this.getUnreadCommentCount() > 0
    ) {
      this.markVisibleCommentsRead();
      this.refreshView();
    }
  }

  private isCommentListNearBottom(): boolean {
    const messages = this.commentMessages?.nativeElement;

    return !messages ||
      messages.scrollHeight - messages.scrollTop - messages.clientHeight < 64;
  }

  isRepresentative(): boolean {
    return String(this.auth.getCurrentUser()?.role ?? '').trim().toLowerCase() === 'representative';
  }

  isOwnComment(comment: ReportComment): boolean {
    return comment.commented_by === this.auth.getCurrentUser()?.user_id;
  }

  canReplyToComments(): boolean {
    const quarter = this.getSelectedQuarter();

    return this.isRepresentative() &&
      this.hasPreviousComment() &&
      !this.isAnnualView &&
      !!quarter &&
      !this.isQuarterApproved(quarter.quarter_id);
  }

  openMobileComments(): void {
    this.mobileCommentsOpen = true;
    this.markVisibleCommentsRead();
    this.cdr.detectChanges();
    this.scrollCommentMessagesToLatest();
    this.loadComments(true);
  }

  closeMobileComments(): void {
    this.mobileCommentsOpen = false;
  }

  hasPreviousComment(): boolean {
    return this.getVisibleComments().length > 0;
  }

  getUnreadCommentCount(): number {
    return this.commentReadState.getUnreadCount(
      this.comments,
      Number(this.auth.getCurrentUser()?.user_id) || 0,
      this.churchId,
      this.departmentId
    );
  }

  private markVisibleCommentsRead(): void {
    this.commentReadState.markAsRead(
      this.getVisibleComments(),
      Number(this.auth.getCurrentUser()?.user_id) || 0,
      this.churchId,
      this.departmentId
    );
  }

  private scrollCommentMessagesToLatest(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const messages = this.commentMessages?.nativeElement;

        if (this.mobileCommentsOpen && messages) {
          messages.scrollTop = messages.scrollHeight;
        }
      });
    });
  }

  submitComment(): void {
    const details = this.commentDraft.trim();
    const quarter = this.getSelectedQuarter();

    if (
      !details ||
      details.length > 255 ||
      this.commentSubmitting ||
      !this.canReplyToComments() ||
      !quarter
    ) {
      return;
    }

    this.commentSubmitting = true;
    this.commentsError = '';

    this.reportService
      .addComment(quarter.quarter_id, this.churchId, this.departmentId, details)
      .subscribe({
        next: response => {
          this.comments = response.data
            ? [...this.comments, response.data]
            : this.comments;
          this.commentDraft = '';
          this.commentSubmitting = false;
          this.refreshView();
          this.scrollCommentMessagesToLatest();
        },
        error: (error: any) => {
          this.commentsError = error?.error?.message || 'Unable to send reply.';
          this.commentSubmitting = false;
          this.refreshView();
        }
      });
  }

  /** Comments for the quarter on screen (or all four quarters in Annual view). */
  getVisibleComments(): ReportComment[] {
    const quarters = this.getVisibleQuarters();

    return this.comments
      .filter(comment =>
        quarters.some(quarter => this.matchesQuarter(comment, quarter))
      )
      .sort(
        (a, b) =>
          String(a.date_commented).localeCompare(String(b.date_commented)) ||
          a.comment_id - b.comment_id
      );
  }

  /** Status comes from comments.status: "commented" once the pastor or assistant commented. */
  getCommentStatus(): 'commented' | 'none' {
    const commented = this.getVisibleComments().some(
      comment =>
        String(comment.status ?? 'commented').toLowerCase() === 'commented'
    );

    return commented ? 'commented' : 'none';
  }

  getCommentQuarterLabel(comment: ReportComment): string {
    if (comment.quarter) {
      return `${comment.quarter}${comment.year ? ' ' + comment.year : ''}`;
    }

    const match = this.availableQuarters.find(
      q => q.quarter_id === comment.quarter_id
    );

    return match ? `${match.quarter} ${match.year}` : '';
  }

  getInitials(name?: string | null): string {
    const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return 'P';

    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ''))
      .toUpperCase();
  }

  private matchesQuarter(item: QuarterRef, quarter: Quarter): boolean {
    if (item.quarter_id === quarter.quarter_id) return true;

    // Fallback when the same quarter has a different quarter_id per program.
    return (
      !!item.quarter &&
      !!item.year &&
      this.quarterNumber(item.quarter) === this.quarterNumber(quarter.quarter) &&
      Number(item.year) === quarter.year
    );
  }

  trackComment(_index: number, comment: ReportComment): number {
    return comment.comment_id;
  }

  // ------------------------------------------------------------------
  // Auto-save
  // ------------------------------------------------------------------

  /** Wait until the user stops typing, then save. */
  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveStatus = 'pending';

    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.autoSave();
    }, this.autoSaveDelayMs);
  }

  /** Save right away if a save is waiting (used before switching views). */
  private flushAutoSave(): void {
    if (!this.autoSaveTimer) return;

    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = null;
    this.autoSave();
  }

  private autoSave(): void {
    const program = this.getSelectedProgram();
    const quarter = this.getSelectedQuarter();

    if (
      this.isAnnualView ||
      !program ||
      !quarter ||
      this.isQuarterApproved(quarter.quarter_id)
    ) {
      this.autoSaveStatus = 'idle';
      return;
    }

    const items = this.buildItems(program, quarter);

    if (!items) {
      this.autoSaveStatus = 'error';
      this.refreshView();
      return;
    }

    this.sendAutoSave(items);
  }

  private sendAutoSave(items: SaveReportItem[]): void {
    // A save is already running: keep only the latest data and send it after.
    if (this.autoSaving) {
      this.autoSaveQueue = items;
      return;
    }

    this.autoSaving = true;
    this.autoSaveStatus = 'saving';
    this.refreshView();

    this.reportService
      .saveDepartmentReport(this.churchId, this.departmentId, items)
      .subscribe({
        next: () => this.finishAutoSave(true),
        error: (error: any) => this.finishAutoSave(false, error)
      });
  }

  private finishAutoSave(success: boolean, error?: any): void {
    this.autoSaving = false;

    if (success) {
      this.autoSaveStatus = this.autoSaveTimer ? 'pending' : 'saved';
    } else {
      this.autoSaveStatus = 'error';
      this.errorMessage =
        error?.error?.message || 'Auto-save failed. Please try again.';
    }

    const queued = this.autoSaveQueue;

    if (queued) {
      this.autoSaveQueue = null;
      this.sendAutoSave(queued);
      return;
    }

    this.refreshView();
  }

  private refreshView(): void {
    if (!this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  /** Builds the payload for one quarter. Returns null if a value is invalid. */
  private buildItems(
    program: Program,
    quarter: Quarter
  ): SaveReportItem[] | null {
    const items: SaveReportItem[] = [];
    const programQuarter = this.getProgramQuarter(program, quarter);

    if (
      !programQuarter &&
      program.sections.some(section => section.particulars.length > 0)
    ) {
      this.errorMessage =
        `The selected quarter is unavailable for ${program.program_name}.`;
      return null;
    }

    for (const section of program.sections) {
      for (const particular of section.particulars) {
        const record = this.getParticularQuarterRecord(particular, quarter);

        let value: number | null = null;

        if (record?.value !== '' && record?.value != null) {
          const numeric = Number(record.value);

          if (!Number.isFinite(numeric) || numeric < 0) {
            this.errorMessage =
              `Invalid value for ${particular.particular_name}.`;
            return null;
          }

          value = numeric;
        }

        const itemQuarterId = record?.quarter_id ?? programQuarter?.quarter_id;
        if (!itemQuarterId) {
          this.errorMessage =
            `The selected quarter is unavailable for ${particular.particular_name}.`;
          return null;
        }

        items.push({
          particular_id: particular.particular_id,
          quarter_id: itemQuarterId,
          value
        });
      }
    }

    return items;
  }

  saveReport(): void {
    if (this.isAnnualView) {
      this.errorMessage = 'Annual view is read-only.';
      return;
    }

    const program = this.getSelectedProgram();
    const quarter = this.getSelectedQuarter();

    if (!program || !quarter) {
      this.errorMessage = 'Select a program and quarter.';
      return;
    }

    // Submit covers anything still waiting for auto-save.
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    const items: SaveReportItem[] = [];
    for (const reportProgram of this.report?.programs ?? [program]) {
      const programQuarter = this.getProgramQuarter(reportProgram, quarter);

      if (
        programQuarter &&
        this.isProgramQuarterApproved(reportProgram, programQuarter)
      ) {
        this.errorMessage =
          `The ${programQuarter.quarter} report for ${reportProgram.program_name} has already been approved.`;
        return;
      }

      const programItems = this.buildItems(reportProgram, quarter);
      if (!programItems) return;
      items.push(...programItems);
    }

    if (items.length === 0) {
      this.errorMessage = 'No report items are available to submit.';
      return;
    }

    const submittedItems = items.map(item => ({
      ...item,
      value: item.value ?? 0
    }));

    this.saving = true;
    this.clearMessages();

    this.reportService
      .saveDepartmentReport(this.churchId, this.departmentId, submittedItems, true)
      .subscribe({
        next: (response: any) => {
          void Swal.fire({
            icon: 'success',
            title: 'Success',
            text: response?.message || 'Report submitted successfully.',
            confirmButtonColor: '#047857'
          });
          this.saving = false;
          this.autoSaveStatus = 'saved';
          this.loadReport();
        },
        error: (error: any) => {
          this.errorMessage =
            error?.error?.message || 'Failed to submit report.';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
  }

  private isProgramQuarterApproved(program: Program, quarter: Quarter): boolean {
    const particulars = program.sections.flatMap(section => section.particulars);

    return particulars.length > 0 && particulars.every(particular =>
      this.isRecordApproved(this.getParticularQuarterRecord(particular, quarter))
    );
  }

  private clearMessages(): void {
    this.errorMessage = '';
  }

  backToPrograms(): void {
    this.flushAutoSave();
    this.router.navigate(['/representative/reports/programs']);
  }

  trackQuarter(_index: number, quarter: Quarter): number {
    return quarter.quarter_id;
  }

  trackProgram(_index: number, program: Program): number {
    return program.program_id;
  }

  trackSection(index: number, section: Section): number {
    return section.program_id ?? index;
  }

  trackParticular(_index: number, particular: Particular): number {
    return particular.particular_id;
  }
}