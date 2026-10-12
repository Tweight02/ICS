import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// UI only: everything below is sample data held in the component.
// Nothing is saved or loaded from a server yet.

type Status = 'Draft' | 'Submitted' | 'Endorsed' | 'Approved';

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

  quarter = Math.ceil((new Date().getMonth() + 1) / 3);

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

  /** The report's year is the year it was submitted (the current year until then). */
  get year(): number {
    return this.dateSubmitted ? Number(this.dateSubmitted.slice(0, 4)) : new Date().getFullYear();
  }

  /** The church can only edit while the report is a draft. */
  get isLocked(): boolean {
    return this.status !== 'Draft';
  }

  get showPercent(): boolean {
    return this.membersId !== null && this.titheUnitsId !== null;
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
        return 'Draft. You can keep editing until you submit.';
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

  // ---- Totals ----

  /** Total of one monthly particular (Offering or Tithes) for the quarter. */
  monthlyTotal(particularId: number): number {
    return (this.monthly[particularId] ?? []).reduce<number>((sum, v) => sum + (v ?? 0), 0);
  }

  // ---- Actions (change local state only) ----

  /** A different quarter is a different report, so start blank. */
  onPeriodChange(): void {
    this.values = {};
    this.monthly = this.blankMonthly();
    this.status = 'Draft';
    this.dateSubmitted = '';
    this.message = '';
  }

  saveDraft(): void {
    if (!this.hasData()) {
      this.setMessage('Nothing to save yet.', true);
      return;
    }
    this.setMessage('Draft saved.', false);
  }

  submit(): void {
    if (!this.hasData()) {
      this.setMessage('Enter your report values before submitting.', true);
      return;
    }
    this.status = 'Submitted';
    this.dateSubmitted = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
    this.setMessage('Report submitted.', false);
  }

  /** Lets the church edit again, only until the district endorses it. */
  reopen(): void {
    if (this.status !== 'Submitted') return;
    this.status = 'Draft';
    this.dateSubmitted = '';
    this.setMessage('Reopened for editing.', false);
  }

  // ---- Helpers ----

  private hasData(): boolean {
    return (
      this.fields.some((f) => this.values[f.particular_id] != null) ||
      this.monthlyFields.some((p) => this.monthly[p.particular_id]?.some((v) => v != null))
    );
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