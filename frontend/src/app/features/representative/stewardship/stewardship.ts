import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// UI only: everything below is sample data held in the component.
// Nothing is saved or loaded from a server yet.

type Status = 'Draft' | 'Submitted' | 'Endorsed' | 'Approved';
type Tab = 'activities' | 'offering';

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
  readonly mission = 'Northeast Luzon Mission';
  readonly programName = 'Stewardship Quarterly Report';

  // Sample: replace with the logged-in church representative's church.
  readonly church = { name: 'LOGAC', district: 'Sample District' };

  readonly quarters = [1, 2, 3, 4];

  readonly years = (() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y];
  })();

  year = new Date().getFullYear();

  /** 1-4 for a quarter, 0 for the read-only Annual view. */
  quarter = Math.ceil((new Date().getMonth() + 1) / 3);

  /** Which section is shown: Stewardship activities or Offering and Tithes. */
  activeTab: Tab = 'activities';

  status: Status = 'Draft';
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

  message = '';
  isError = false;
  saved = false; // true once a change has been saved automatically

  constructor() {
    this.setParticulars(
      [
        'No. of Church Members',
        'No. of STW Seminar conducted',
        'No. of STW Promotion conducted',
        'No. of Families visited & given STW awareness program',
        'No. of Certification Seminars conducted on Basic STW Educator',
        'No. of Pastors/Local church leaders as basic STW educator',
        'No. of STW sermons preached on Biblical Stewardship',
        'No. of Tithe Giving Units',
        'No. of church members practicing Combine Offering Plan',
        'Number of members participating in regular giving',
        'Number of notable challenges or success stories',
        'Offering',
        'Tithes',
      ].map((particulars_name, i) => ({ particular_id: i + 1, particulars_name })),
    );
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

  /** True once every box in the report is filled; the Submit button only shows then. */
  get isComplete(): boolean {
    return this.missingActivities() + this.missingOffering() === 0;
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
    return this.quarters.reduce((sum, q) => sum + (this.readStored(q)?.values?.[particularId] ?? 0), 0);
  }

  /** Offering or Tithes total for one quarter. */
  annualQuarterTotal(particularId: number, q: number): number {
    const months: (number | null)[] = this.readStored(q)?.monthly?.[particularId] ?? [];
    return months.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  }

  /** Offering or Tithes total for the whole year. */
  annualTotal(particularId: number): number {
    return this.quarters.reduce((sum, q) => sum + this.annualQuarterTotal(particularId, q), 0);
  }

  // ---- Actions (change local state only) ----

  /** A different quarter is a different report: show what was saved for it. */
  onPeriodChange(): void {
    this.message = '';
    this.load();
  }

  /** Called when any box changes: saves it automatically. */
  onFieldChange(): void {
    if (this.isLocked) return;
    this.message = '';
    // Wait one tick so ngModel has stored the new value before saving.
    setTimeout(() => {
      this.persist();
      this.saved = true;
    });
  }

  submit(): void {
    const missingActivities = this.missingActivities();
    const missingOffering = this.missingOffering();
    if (missingActivities + missingOffering > 0) {
      const parts: string[] = [];
      if (missingActivities) parts.push(`${missingActivities} in Stewardship Activities`);
      if (missingOffering) parts.push(`${missingOffering} in Offering and Tithes`);
      this.setMessage(`Complete the whole report before submitting. Missing: ${parts.join(', ')}.`, true);
      return;
    }
    this.status = 'Submitted';
    this.dateSubmitted = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
    this.persist();
    this.setMessage('Report submitted.', false);
  }

  /** Lets the church edit again, only until the district endorses it. */
  reopen(): void {
    if (this.status !== 'Submitted') return;
    this.status = 'Draft';
    this.dateSubmitted = '';
    this.persist();
    this.setMessage('Reopened for editing.', false);
  }

  // ---- Helpers ----

  // Stand-in for the backend: keeps the report in this browser so it survives a refresh.
  // Replace persist() and load() with API calls later.
  private keyFor(q: number): string {
    return `stewardship:${this.church.name}:${this.year}:q${q}`;
  }

  private get storageKey(): string {
    return this.keyFor(this.quarter);
  }

  private readStored(q: number): any {
    try {
      const raw = localStorage.getItem(this.keyFor(q));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          values: this.values,
          monthly: this.monthly,
          status: this.status,
          dateSubmitted: this.dateSubmitted,
        }),
      );
    } catch {
      // Storage unavailable: nothing to do.
    }
  }

  private load(): void {
    this.values = {};
    this.monthly = this.blankMonthly();
    this.status = 'Draft';
    this.dateSubmitted = '';
    this.saved = false;
    if (this.isAnnual) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.values = data.values ?? {};
      this.monthly = { ...this.monthly, ...(data.monthly ?? {}) };
      this.status = data.status ?? 'Draft';
      this.dateSubmitted = data.dateSubmitted ?? '';
    } catch {
      // Unreadable saved data: start blank.
    }
  }

  /** A box counts as filled once it has a number (0 is fine; empty is not). */
  private isFilled(v: number | null | undefined): boolean {
    return v !== null && v !== undefined && (v as unknown) !== '' && !Number.isNaN(v);
  }

  /** Stewardship activity boxes still empty. */
  private missingActivities(): number {
    return this.fields.filter((f) => !this.isFilled(this.values[f.particular_id])).length;
  }

  /** Offering and Tithes month boxes still empty. */
  private missingOffering(): number {
    let missing = 0;
    for (const p of this.monthlyFields) {
      for (let i = 0; i < 3; i++) {
        if (!this.isFilled(this.monthly[p.particular_id]?.[i])) missing++;
      }
    }
    return missing;
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

  private setMessage(text: string, error: boolean): void {
    this.message = text;
    this.isError = error;
  }
}