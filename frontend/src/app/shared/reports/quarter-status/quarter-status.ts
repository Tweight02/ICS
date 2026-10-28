import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type QuarterStatusTone =
  | 'approved'
  | 'complete'
  | 'endorsed'
  | 'submitted'
  | 'pending'
  | 'in-progress'
  | 'incomplete'
  | 'ready'
  | 'not-started'
  | 'empty';

export interface QuarterStatusValue {
  label: string;
  tone: QuarterStatusTone;
}

export function resolveQuarterStatus(quarter: {
  progress: number | null;
  approved: boolean;
  submitted: boolean;
}): QuarterStatusValue {
  if (quarter.progress === null) {
    return { label: '-', tone: 'empty' };
  }

  if (quarter.approved) {
    return { label: 'Approved', tone: 'approved' };
  }

  if (quarter.submitted) {
    return { label: 'Submitted for review', tone: 'submitted' };
  }

  return quarter.progress >= 100
    ? { label: 'Ready to submit', tone: 'ready' }
    : { label: 'Needs completion', tone: 'incomplete' };
}

@Component({
  selector: 'app-quarter-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quarter-status.html',
})
export class QuarterStatus {
  label = input<string | null>(null);
  tone = input<QuarterStatusTone>('empty');
  progress = input<number | null>(null);
  showProgress = input(false);

  get text(): string {
    if (this.label() !== null) {
      return this.label() ?? '';
    }

    if (this.tone() === 'approved' || this.tone() === 'complete') {
      return '';
    }

    if (this.showProgress()) {
      const progress = this.progress();
      return progress === null || progress <= 0
        ? '—'
        : `${progress}%`;
    }

    return this.tone() === 'empty' ? '-' : '';
  }

  get classes(): string {
    switch (this.tone()) {
      case 'approved':
      case 'complete':
        return 'text-emerald-700';
      case 'endorsed':
        return 'text-teal-700';
      case 'pending':
      case 'submitted':
        return 'text-amber-800';
      case 'in-progress':
        return 'text-blue-700';
      case 'incomplete':
        return 'text-rose-700';
      case 'ready':
        return 'text-blue-700';
      case 'not-started':
      default:
        return 'text-slate-400';
    }
  }
}
