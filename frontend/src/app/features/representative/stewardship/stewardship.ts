import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Observable } from 'rxjs';
import {
  StewardshipActionResponse,
  StewardshipReportData,
  StewardshipReportSnapshot,
  StewardshipService,
  StewardshipStatus,
} from '../../../core/services/stewardship/stewardship.service';

interface Particular {
  particular_id: number;
  particulars_name: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Entered month by month; every other particular is a single value.
const MONTHLY_PARTICULARS = ['offering', 'tithes'];

@Component({
  selector: 'app-stewardship',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './stewardship.html',
})
export class Stewardship {
  church = { name: '', district: '' };

  readonly quarters = [1, 2, 3, 4];

  readonly years = (() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y];
  })();

  year = new Date().getFullYear();

  /** 1-4 for a quarter, 0 for the read-only Annual view. */
  quarter = Math.ceil((new Date().getMonth() + 1) / 3);

  status: StewardshipStatus = 'Draft';
  dateSubmitted = '';

  // Columns (the program's particulars)
  particulars: Particular[] = [];
  fields: Particular[] = []; // single-value fields
  monthlyFields: Particular[] = []; // Offering, Tithes
  membersId: number | null = null;
  titheUnitsId: number | null = null;

  // This church's entries
  values: Record<number, number | null> = {}; // particular_id -> value
  monthly: Record<number, (number | null)[]> = {}; // particular_id -> value for each month of the quarter
  annualReports: Record<number, StewardshipReportData> = {};

  message = '';
  isError = false;
  saved = false; // true once a change has been saved automatically
  isLoading = false;
  isSaving = false;

  private loadedYear = this.year;
  private loadedQuarter = this.quarter;
  private loadSequence = 0;
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly stewardshipService: StewardshipService) {
    this.load();
  }

  // ---- Getters ----

  /** Month numbers (1-12) covered by the selected quarter. */
  get monthNumbers(): number[] {
    const start = (this.quarter - 1) * 3;
    return [start + 1, start + 2, start + 3];
  }

  get monthLabels(): string[] {
    return this.monthNumbers.map((m) => MONTH_NAMES[m - 1]);
  }

  get isAnnual(): boolean {
    return this.quarter === 0;
  }

  get periodLabel(): string {
    return this.isAnnual ? 'Annual' : `Q${this.quarter}`;
  }

  /** The church can only edit while the report is a draft, and never in the Annual view. */
  get isLocked(): boolean {
    return this.isAnnual || this.status !== 'Draft';
  }

  get showPercent(): boolean {
    return !this.isAnnual && this.membersId !== null && this.titheUnitsId !== null;
  }

  /** % of members returning tithe = tithe giving units / church members * 100. */
  get percentReturning(): number {
    if (this.membersId === null || this.titheUnitsId === null) return 0;
    const members = this.values[this.membersId];
    const units = this.values[this.titheUnitsId] ?? 0;
    return members ? (units / members) * 100 : 0;
  }

  get statusNote(): string {
    switch (this.status) {
      case 'Submitted':
        return 'Submitted. Waiting for the district to endorse it.';
      case 'Endorsed':
        return 'Endorsed by the district. Waiting for mission approval.';
      case 'Approved':
        return 'Approved by the mission. This report is final.';
      default:
        return '';
    }
  }

  get statusClass(): string {
    switch (this.status) {
      case 'Approved':
        return 'bg-green-100 text-green-700';
      case 'Endorsed':
        return 'bg-blue-100 text-blue-700';
      case 'Submitted':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }

  get saveLabel(): string {
    return this.saved && this.status === 'Draft' ? 'All changes saved' : '';
  }

  // ---- Totals ----

  /** Total of one monthly particular (Offering or Tithes) for the quarter. */
  monthlyTotal(particularId: number): number {
    if (this.isAnnual) return this.annualTotal(particularId);
    return (this.monthly[particularId] ?? []).reduce<number>((sum, v) => sum + (v ?? 0), 0);
  }

  // ---- Annual view (read-only, adds up the four saved quarters) ----

  /** Sum of a single-value particular across Q1-Q4. */
  annualField(particularId: number): number {
    return this.quarters.reduce(
      (sum, q) => sum + (this.annualReports[q]?.values?.[particularId] ?? 0),
      0,
    );
  }

  /** Offering or Tithes total for one quarter. */
  annualQuarterTotal(particularId: number, q: number): number {
    const months = this.annualReports[q]?.monthly?.[particularId] ?? [];
    return months.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  }

  /** Offering or Tithes total for the whole year. */
  annualTotal(particularId: number): number {
    return this.quarters.reduce((sum, q) => sum + this.annualQuarterTotal(particularId, q), 0);
  }

  // ---- Actions ----

  /** A different quarter is a different report: load it from the API. */
  onPeriodChange(): void {
    this.flushPendingSave();
    this.message = '';
    this.load();
  }

  /** Called when any box changes: save a snapshot automatically. */
  onFieldChange(): void {
    if (this.isLocked || this.isLoading || this.loadedQuarter === 0) return;
    this.message = '';
    this.saved = false;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushPendingSave(), 400);
  }

  submit(): void {
    if (this.isLoading || this.isLocked) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    this.fillEmptyWithZero();
    this.dirty = false;
    const snapshot = this.createSnapshot(this.year, this.quarter);
    this.enqueueOperation(
      () => this.stewardshipService.submitReport(snapshot),
      this.periodKey(this.year, this.quarter),
      (response) => {
        this.status = response.status;
        this.dateSubmitted = response.dateSubmitted ?? '';
        this.saved = true;
        this.setMessage(response.message, false);
      },
    );
  }

  /** Lets the church edit again, only until the district endorses it. */
  reopen(): void {
    if (this.status !== 'Submitted' || this.isLoading) return;
    this.enqueueOperation(
      () => this.stewardshipService.reopenReport(this.year, this.quarter),
      this.periodKey(this.year, this.quarter),
      (response) => {
        this.status = response.status;
        this.dateSubmitted = '';
        this.saved = true;
        this.setMessage(response.message, false);
      },
    );
  }

  // ---- Helpers ----

  private load(): void {
    const sequence = ++this.loadSequence;
    const requestedYear = this.year;
    const requestedQuarter = this.quarter;
    this.isLoading = true;
    this.isSaving = false;
    this.values = {};
    this.monthly = this.blankMonthly();
    this.annualReports = {};
    this.status = 'Draft';
    this.dateSubmitted = '';
    this.saved = false;
    this.stewardshipService.getReport(requestedYear, requestedQuarter).subscribe({
      next: (response) => {
        if (sequence !== this.loadSequence) return;
        this.church = {
          name: response.church.name,
          district: response.church.district ?? '',
        };
        this.setParticulars(response.particulars.map((particular) => ({
          particular_id: particular.particular_id,
          particulars_name: particular.particular_name,
        })));
        this.loadedYear = requestedYear;
        this.loadedQuarter = requestedQuarter;
        if (requestedQuarter === 0) {
          this.annualReports = response.reports ?? {};
        } else if (response.report) {
          this.applyReport(response.report);
        }
        this.isLoading = false;
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.isLoading = false;
        this.setMessage(this.errorMessage(error), true);
      },
    });
  }

  /** A box counts as filled once it has a number (0 is fine; empty is not). */
  private isFilled(v: number | null | undefined): boolean {
    return v !== null && v !== undefined && !Number.isNaN(v);
  }

  /** Any box left empty is submitted as 0. */
  private fillEmptyWithZero(): void {
    for (const f of this.fields) {
      if (!this.isFilled(this.values[f.particular_id])) this.values[f.particular_id] = 0;
    }
    for (const p of this.monthlyFields) {
      const months = this.monthly[p.particular_id] ?? [null, null, null];
      this.monthly[p.particular_id] = months.map((v) => (this.isFilled(v) ? v : 0));
    }
  }

  private setParticulars(list: Particular[]): void {
    this.particulars = list;
    this.fields = list.filter((p) => !this.isMonthly(p));
    this.monthlyFields = list.filter((p) => this.isMonthly(p));
    this.membersId = this.fields.find((f) => /church members/i.test(f.particulars_name))?.particular_id ?? null;
    this.titheUnitsId = this.fields.find((f) => /tithe giving units/i.test(f.particulars_name))?.particular_id ?? null;
    this.monthly = this.blankMonthly();
  }

  private blankMonthly(): Record<number, (number | null)[]> {
    const result: Record<number, (number | null)[]> = {};
    for (const p of this.monthlyFields) result[p.particular_id] = [null, null, null];
    return result;
  }

  private isMonthly(p: Particular): boolean {
    return MONTHLY_PARTICULARS.includes(p.particulars_name.trim().toLowerCase());
  }

  private applyReport(report: StewardshipReportData): void {
    this.values = { ...this.values, ...report.values };
    this.monthly = { ...this.monthly, ...report.monthly };
    this.status = report.status;
    this.dateSubmitted = report.dateSubmitted ?? '';
  }

  private flushPendingSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (!this.dirty || this.loadedQuarter === 0) return;

    this.dirty = false;
    const year = this.loadedYear;
    const quarter = this.loadedQuarter;
    const snapshot = this.createSnapshot(year, quarter);
    this.enqueueOperation(
      () => this.stewardshipService.saveReport(snapshot),
      this.periodKey(year, quarter),
      (response) => {
        this.saved = true;
        this.setMessage(response.message, false);
      },
    );
  }

  private createSnapshot(year: number, quarter: number): StewardshipReportSnapshot {
    return {
      year,
      quarter,
      values: this.fields.map((field) => ({
        particular_id: field.particular_id,
        value: this.values[field.particular_id],
      })),
      monthly: this.monthlyFields.map((field) => ({
        particular_id: field.particular_id,
        values: [...(this.monthly[field.particular_id] ?? [null, null, null])],
      })),
    };
  }

  private enqueueOperation(
    request: () => Observable<StewardshipActionResponse>,
    key: string,
    onSuccess: (response: StewardshipActionResponse) => void,
  ): void {
    this.isSaving = true;
    this.operationQueue = this.operationQueue.then(async () => {
      try {
        const response = await firstValueFrom(request());
        if (this.periodKey(this.year, this.quarter) === key) onSuccess(response);
      } catch (error: unknown) {
        if (this.periodKey(this.year, this.quarter) === key) {
          this.setMessage(this.errorMessage(error), true);
        }
      } finally {
        if (this.periodKey(this.year, this.quarter) === key) this.isSaving = false;
      }
    });
  }

  private periodKey(year: number, quarter: number): string {
    return `${year}:q${quarter}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'Unable to load or save the stewardship report. Please try again.';
  }

  private setMessage(text: string, error: boolean): void {
    this.message = text;
    this.isError = error;
  }
}