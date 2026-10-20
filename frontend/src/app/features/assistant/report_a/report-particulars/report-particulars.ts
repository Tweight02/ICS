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
import { UserRole } from '../../../../core/models/user.model';
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

interface ReportComment {
  comment_id: number;
  quarter_id: number;
  commented_by: number;
  details: string;
  date_commented: string;
  status?: string | null;
  commenter_name?: string;
  commenter_role?: string;
  quarter?: string;
  year?: number | string;
}

interface QuarterRef {
  quarter_id: number;
  quarter?: string;
  year?: number | string;
}

@Component({
  selector: 'app-report-particulars',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-particulars.html',
  styleUrl: './report-particulars.css'
})
export class ReportParticulars implements OnInit, OnDestroy {
  @ViewChild('commentMessages')
  private commentMessages?: ElementRef<HTMLUListElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportService = inject(ReportService);
  private readonly commentReadState = inject(CommentReadStateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly auth = inject(AuthService);

  churchId = 0;
  churchName = '';
  districtId = 0;
  districtName = '';
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

  private readonly savingActionState = signal(false);
  get savingAction(): boolean {
    return this.savingActionState();
  }
  set savingAction(value: boolean) {
    this.savingActionState.set(value);
  }
  errorMessage = '';
  successMessage = '';

  comments: ReportComment[] = [];
  private readonly commentsLoadingState = signal(false);
  get commentsLoading(): boolean {
    return this.commentsLoadingState();
  }
  set commentsLoading(value: boolean) {
    this.commentsLoadingState.set(value);
  }
  commentsError = '';
  newComment = '';
  private readonly savingCommentState = signal(false);
  get savingComment(): boolean {
    return this.savingCommentState();
  }
  set savingComment(value: boolean) {
    this.savingCommentState.set(value);
  }

  currentUserRole: UserRole | null = null;
  currentUserId = 0;
  mobileCommentsOpen = false;
  private commentPollingTimer: ReturnType<typeof setInterval> | null = null;
  private commentsRequestInFlight = false;
  private readonly commentPollingIntervalMs = 5000;

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.currentUserRole = user?.role ?? null;
    this.currentUserId = Number(user?.user_id) || 0;

    this.route.paramMap.subscribe(() => this.readRoute());
    this.route.queryParamMap.subscribe(() => this.readRoute());
  }

  ngOnDestroy(): void {
    this.stopCommentPolling();
  }

  get canComment(): boolean {
    return ['pastor', 'district pastor', 'assistant', 'administrative assistant']
      .includes(this.normalizedUserRole);
  }

  get canEndorse(): boolean {
    return ['pastor', 'district pastor'].includes(this.normalizedUserRole);
  }

  get canApprove(): boolean {
    return ['assistant', 'administrative assistant'].includes(this.normalizedUserRole);
  }

  private get normalizedUserRole(): string {
    return String(this.currentUserRole ?? '')
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ');
  }

  private readRoute(): void {
    const departmentId = Number(this.route.snapshot.paramMap.get('departmentId'));
    const params = this.route.snapshot.queryParamMap;

    this.departmentId = departmentId;
    this.churchId = Number(params.get('church_id')) || 0;
    this.churchName = params.get('church_name') || '';
    this.districtId = Number(params.get('district_id')) || 0;
    this.districtName = params.get('district_name') || '';

    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      this.errorMessage = 'Department ID was not provided.';
      return;
    }

    if (!this.churchId) {
      this.errorMessage = 'Church ID was not provided.';
      return;
    }

    this.loadReport();
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
          this.errorMessage =
            error?.error?.message || 'Unable to load report.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private initializeSelections(): void {
    const programs = this.report?.programs ?? [];

    if (!programs.some(program => program.program_id === this.selectedProgramId)) {
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
      ...new Set(this.availableQuarters.map(quarter => quarter.year))
    ].sort((a, b) => b - a);

    if (
      this.selectedYear === null ||
      !this.availableYears.includes(this.selectedYear)
    ) {
      this.selectedYear = this.availableYears[0] ?? null;
    }

    if (
      !this.getQuartersForYear().some(
        quarter => quarter.quarter_id === this.selectedQuarterId
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
      quarter => quarter.year === this.selectedYear
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
    return this.getQuartersForYear().find(
      quarter => quarter.quarter_id === this.selectedQuarterId
    ) ?? null;
  }

  selectYear(year: number): void {
    this.selectedYear = Number(year);
    this.isAnnualView = false;
    this.selectedQuarterId =
      this.getQuartersForYear()[0]?.quarter_id ?? null;
    this.clearMessages();
  }

  selectQuarter(quarter: Quarter): void {
    this.isAnnualView = false;
    this.selectedQuarterId = quarter.quarter_id;
    this.clearMessages();
  }

  selectAnnual(): void {
    this.isAnnualView = true;
    this.clearMessages();
  }

  selectProgram(programId: number): void {
    this.selectedProgramId = programId;
    this.clearMessages();
  }

  getSelectedProgram(): Program | null {
    return this.report?.programs?.find(
      program => program.program_id === this.selectedProgramId
    ) ?? null;
  }

  getParticularQuarterRecord(
    particular: Particular,
    quarter: Quarter
  ): QuarterRecord | null {
    return particular.quarters?.find(record =>
      this.matchesQuarter(record, quarter)
    ) ?? null;
  }

  private hasFlag(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  isRecordApproved(record: QuarterRecord | null): boolean {
    return this.hasFlag(record?.mission_approve);
  }

  isRecordEndorsed(record: QuarterRecord | null): boolean {
    return this.hasFlag(record?.district_endorse) && !this.isRecordApproved(record);
  }

  isQuarterApproved(quarter: Quarter | null = this.getSelectedQuarter()): boolean {
    if (!quarter) {
      return false;
    }

    return this.collectQuarterRecords(quarter).some(record =>
      this.isRecordApproved(record)
    );
  }

  isQuarterEndorsed(quarter: Quarter | null = this.getSelectedQuarter()): boolean {
    if (!quarter || this.isQuarterApproved(quarter)) {
      return false;
    }

    const records = this.collectQuarterRecords(quarter);

    return records.length > 0 &&
      records.every(record => this.hasFlag(record.district_endorse));
  }

  private collectQuarterRecords(quarter: Quarter): QuarterRecord[] {
    const records: QuarterRecord[] = [];

    for (const program of this.report?.programs ?? []) {
      for (const section of program.sections ?? []) {
        for (const particular of section.particulars ?? []) {
          const record = this.getParticularQuarterRecord(particular, quarter);

          if (record) {
            records.push(record);
          }
        }
      }
    }

    return records;
  }

  getQuarterValue(
    particular: Particular,
    quarter: Quarter
  ): number | string | null {
    return this.getParticularQuarterRecord(particular, quarter)?.value ?? null;
  }

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
          this.cdr.detectChanges();
          if (this.mobileCommentsOpen && hasNewVisibleComment && wasNearBottom) {
            this.markVisibleCommentsRead();
            this.scrollCommentMessagesToLatest();
          }
          this.startCommentPolling();
        },
        error: (error: any) => {
          this.commentsRequestInFlight = false;
          if (!silent) {
            this.commentsError =
              error?.error?.message || 'Unable to load comments.';
            this.commentsLoading = false;
            this.cdr.detectChanges();
          }
          this.startCommentPolling();
        }
      });
  }

  private startCommentPolling(): void {
    if (this.commentPollingTimer) return;

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

  getCommentStatus(): 'commented' | 'none' {
    return this.getVisibleComments().length > 0 ? 'commented' : 'none';
  }

  isOwnComment(comment: ReportComment): boolean {
    return comment.commented_by === this.currentUserId;
  }

  openComments(): void {
    this.mobileCommentsOpen = true;
    this.markVisibleCommentsRead();
    this.cdr.detectChanges();
    this.scrollCommentMessagesToLatest();
    this.loadComments(true);
  }

  closeComments(): void {
    this.mobileCommentsOpen = false;
  }

  getUnreadCommentCount(): number {
    return this.commentReadState.getUnreadCount(
      this.comments,
      this.currentUserId,
      this.churchId,
      this.departmentId
    );
  }

  private markVisibleCommentsRead(): void {
    this.commentReadState.markAsRead(
      this.getVisibleComments(),
      this.currentUserId,
      this.churchId,
      this.departmentId
    );
  }

  onCommentMessagesScroll(): void {
    if (
      this.mobileCommentsOpen &&
      this.isCommentListNearBottom() &&
      this.getUnreadCommentCount() > 0
    ) {
      this.markVisibleCommentsRead();
      this.cdr.detectChanges();
    }
  }

  private isCommentListNearBottom(): boolean {
    const messages = this.commentMessages?.nativeElement;

    return !messages ||
      messages.scrollHeight - messages.scrollTop - messages.clientHeight < 64;
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

  getCommentQuarterLabel(comment: ReportComment): string {
    if (comment.quarter) {
      return `${comment.quarter}${comment.year ? ' ' + comment.year : ''}`;
    }

    const match = this.availableQuarters.find(
      quarter => quarter.quarter_id === comment.quarter_id
    );

    return match ? `${match.quarter} ${match.year}` : '';
  }

  getInitials(name?: string): string {
    const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);

    if (!parts.length) {
      return 'P';
    }

    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ''))
      .toUpperCase();
  }

  private matchesQuarter(item: QuarterRef, quarter: Quarter): boolean {
    if (item.quarter_id === quarter.quarter_id) {
      return true;
    }

    return (
      !!item.quarter &&
      !!item.year &&
      this.quarterNumber(item.quarter) === this.quarterNumber(quarter.quarter) &&
      Number(item.year) === quarter.year
    );
  }

  commentQuarterId(): number {
    const selected = this.getSelectedQuarter();

    if (!selected) {
      return 0;
    }

    const program = this.getSelectedProgram();

    for (const section of program?.sections ?? []) {
      for (const particular of section.particulars ?? []) {
        const record = this.getParticularQuarterRecord(particular, selected);

        if (record?.quarter_id) {
          return record.quarter_id;
        }
      }
    }

    return selected.quarter_id;
  }

  publishComment(): void {
    const details = this.newComment.trim();

    if (!details || this.savingComment || !this.canComment) {
      return;
    }

    if (details.length > 255) {
      this.errorMessage = 'Comments must not exceed 255 characters.';
      return;
    }

    if (this.isAnnualView) {
      this.errorMessage = 'Select a quarter to add a comment.';
      return;
    }

    const quarterId = this.commentQuarterId();

    if (!quarterId) {
      this.errorMessage = 'No report quarter is available for comments.';
      return;
    }

    if (this.isQuarterApproved()) {
      this.errorMessage = 'This report has been approved. Comments are closed.';
      return;
    }

    this.savingComment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.reportService
      .addComment(quarterId, this.churchId, this.departmentId, details)
      .subscribe({
        next: (response: any) => {
          const comment = response?.data ?? response;

          if (comment) {
            this.comments.unshift(comment as ReportComment);
          }

          this.newComment = '';
          this.savingComment = false;
          this.successMessage = 'Comment published.';
          this.cdr.detectChanges();
          this.scrollCommentMessagesToLatest();
        },
        error: (error: any) => {
          this.savingComment = false;
          this.errorMessage =
            error?.error?.message || 'Unable to save comment.';
          this.cdr.detectChanges();
        }
      });
  }

  endorseReport(): void {
    this.updateWorkflow('endorse');
  }

  approveReport(): void {
    this.updateWorkflow('approve');
  }

  private updateWorkflow(action: 'endorse' | 'approve'): void {
    if ((action === 'endorse' && !this.canEndorse) ||
        (action === 'approve' && !this.canApprove)) {
      this.errorMessage = 'Your account is not authorized for this report action.';
      return;
    }

    const quarter = this.getSelectedQuarter();

    if (this.isAnnualView || !quarter || this.savingAction) {
      this.errorMessage = 'Select a quarter first.';
      return;
    }

    this.savingAction = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = action === 'endorse'
      ? this.reportService.endorseDepartmentReport(
          this.churchId,
          this.departmentId,
          quarter.year,
          quarter.quarter
        )
      : this.reportService.approveDepartmentReport(
          this.churchId,
          this.departmentId,
          quarter.year,
          quarter.quarter
        );

    request.subscribe({
      next: response => {
        const message = response?.message ||
          (action === 'endorse'
            ? 'Report endorsed for the administrative assistant.'
            : 'Report approved.');
        if (action === 'approve') {
          void Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            confirmButtonColor: '#047857'
          });
        } else {
          this.successMessage = message;
        }
        this.savingAction = false;
        this.loadReport();
      },
      error: (error: any) => {
        this.savingAction = false;
        this.errorMessage =
          error?.error?.message ||
          (action === 'endorse'
            ? 'Unable to endorse this report.'
            : 'Unable to approve this report.');
        this.cdr.detectChanges();
      }
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  backToPrograms(): void {
    this.router.navigate([`${this.portalPrefix()}/reports/programs`], {
      queryParams: {
        district_id: this.districtId || null,
        district_name: this.districtName || null,
        church_id: this.churchId || null,
        church_name: this.churchName || null
      }
    });
  }

  private portalPrefix(): '/pastor' | '/assistant' | '/director' {
    const url = this.router.url;

    if (url.startsWith('/assistant')) {
      return '/assistant';
    }

    if (url.startsWith('/director')) {
      return '/director';
    }

    return '/pastor';
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

  onSectionToggle(event: Event): void {
    const openedSection = event.currentTarget as HTMLDetailsElement;

    if (!openedSection.open) return;

    const sections = openedSection.parentElement?.parentElement
      ?.querySelectorAll<HTMLDetailsElement>('details[name="report-section-accordions"]');

    sections?.forEach(section => {
      if (section !== openedSection) {
        section.open = false;
      }
    });
  }

  trackParticular(_index: number, particular: Particular): number {
    return particular.particular_id;
  }

  trackComment(_index: number, comment: ReportComment): number {
    return comment.comment_id;
  }
}
