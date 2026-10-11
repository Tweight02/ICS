import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import { ReportMonitoring } from '../../../../core/models/report.model';
import { ReportService } from '../../../../core/services/report/report';

@Component({
  selector: 'app-reports-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-details.html',
  styleUrl: './reports-details.css'
})
export class ReportsDetails implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private churchService = inject(ChurchService);
  private reportService = inject(ReportService);

  districtId = 0;
  districtName = '';

  district: Church | null = null;
  churches: Church[] = [];
  monitoring: Record<number, ReportMonitoring> = {};
  loadingChurches = false;
  loadingMonitoring = false;

  errorMessage = '';

ngOnInit(): void {
  this.loadChurches();
}

loadChurches(): void {
  this.errorMessage = '';
  this.loadingChurches = true;
  this.loadingMonitoring = false;
  this.cdr.detectChanges();

  this.churchService.getMyDistrictChurches().subscribe({
    next: (response) => {
      this.loadingChurches = false;
      console.log('[REPORT DETAILS] API response:', response);

      this.district = response.district;
      this.districtId = response.district?.church_id ?? 0;
      this.districtName = response.district?.name ?? '';

      this.churches = Array.isArray(response.data)
        ? response.data
        : [];

      this.loadChurchMonitoring();

      console.log('[REPORT DETAILS] District:', this.districtName);
      console.log('[REPORT DETAILS] Church count:', this.churches.length);
      console.log('[REPORT DETAILS] Churches:', this.churches);

      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('[REPORT DETAILS] API error:', error);

      this.churches = [];
      this.monitoring = {};
      this.district = null;
      this.loadingChurches = false;
      this.loadingMonitoring = false;
      this.errorMessage =
        error.status === 401
          ? 'Your session has expired. Please log in again.'
          : 'Unable to load your district churches.';

      this.cdr.detectChanges();
    }
  });
}

  openDepartmentReports(): void {

    this.router.navigate(
      ['/pastor/reports/programs'],
      {
        queryParams: {
          district_id: this.districtId,
          district_name: this.districtName
        }
      }
    );

  }


openChurch(church: Church): void {
  this.router.navigate([
    '/pastor/reports/programs',
    this.districtId,
    church.church_id
  ]);
}

  private loadChurchMonitoring(): void {
    this.monitoring = {};

    if (this.churches.length === 0) {
      this.loadingMonitoring = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingMonitoring = true;
    this.cdr.detectChanges();
    forkJoin(
      this.churches.map(church =>
        this.reportService.getChurchMonitoring(church.church_id)
      )
    ).subscribe({
      next: summaries => {
        summaries.forEach((summary, index) => {
          this.monitoring[this.churches[index].church_id] = summary;
        });
        this.loadingMonitoring = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Unable to load church report monitoring:', error);
        this.loadingMonitoring = false;
        this.errorMessage = 'Unable to load church report monitoring.';
        this.cdr.detectChanges();
      }
    });
  }

  getMonitoring(churchId: number): ReportMonitoring {
    return this.monitoring[churchId] ?? {
      q1: null,
      q2: null,
      q3: null,
      q4: null
    };
  }

}