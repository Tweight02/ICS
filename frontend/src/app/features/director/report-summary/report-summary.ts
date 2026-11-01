import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MissionReportSummary } from '../../../core/models/report.model';
import { AuthService } from '../../../core/services/auth/auth-service';
import { ChurchService } from '../../../core/services/church/church-service';
import {
  CURRENT_REPORT_YEAR,
  REPORT_YEAR_OPTIONS,
  resolveReportYear
} from '../../../core/utils/report-year';
import { RunningLoader } from '../../../shared/components/running-loader/running-loader';

@Component({
  selector: 'app-director-report-summary',
  standalone: true,
  imports: [CommonModule, RunningLoader],
  templateUrl: './report-summary.html'
})
export class DirectorReportSummary implements OnInit {
  readonly reportYears = REPORT_YEAR_OPTIONS;
  readonly selectedYear = signal(CURRENT_REPORT_YEAR);
  readonly summary = signal<MissionReportSummary | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  private readonly churchService = inject(ChurchService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.selectedYear.set(
      resolveReportYear(this.route.snapshot.queryParamMap.get('year'))
    );
    this.loadSummary();
  }

  private get assignedDepartmentId(): number | null {
    const departmentId = Number(this.authService.getCurrentUser()?.department_id);
    return Number.isInteger(departmentId) && departmentId > 0 ? departmentId : null;
  }

  onYearChange(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    if (!this.reportYears.includes(year) || year === this.selectedYear()) {
      return;
    }

    this.selectedYear.set(year);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadSummary();
  }

  backToReports(): void {
    void this.router.navigate(['/director/reports'], {
      queryParams: { year: this.selectedYear() }
    });
  }

  loadSummary(): void {
    if (this.assignedDepartmentId === null) {
      this.summary.set(null);
      this.errorMessage.set('A department must be assigned to your Director account.');
      this.loading.set(false);
      return;
    }

    const requestedYear = this.selectedYear();
    this.loading.set(true);
    this.errorMessage.set('');

    this.churchService.getMissionReportSummary(requestedYear).subscribe({
      next: response => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        if (!response?.success || !response.data) {
          this.summary.set(null);
          this.errorMessage.set('Unable to load the mission-wide report summary.');
          this.loading.set(false);
          return;
        }

        this.summary.set(response.data);
        this.loading.set(false);
      },
      error: error => {
        if (requestedYear !== this.selectedYear()) {
          return;
        }
        console.error('Failed to load the mission-wide report summary:', error);
        this.summary.set(null);
        this.errorMessage.set('Unable to load the mission-wide report summary.');
        this.loading.set(false);
      }
    });
  }
}
