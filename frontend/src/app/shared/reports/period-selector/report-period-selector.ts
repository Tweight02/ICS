import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ReportQuarterOption {
  quarter_id: number;
  quarter: string;
  year: number;
}

export type ReportPeriodStatus = 'approved' | 'endorsed' | null;

@Component({
  selector: 'app-report-period-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-period-selector.html',
})
export class ReportPeriodSelector {
  years = input<number[]>([]);
  quarters = input<ReportQuarterOption[]>([]);
  selectedYear = input<number | null>(null);
  selectedQuarterId = input<number | null>(null);
  annualView = input(false);
  status = input<ReportPeriodStatus>(null);

  yearChanged = output<number>();
  quarterSelected = output<ReportQuarterOption>();
  annualSelected = output<void>();
}
