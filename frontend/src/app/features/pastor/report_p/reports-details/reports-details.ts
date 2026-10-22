import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';

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

  districtId = 0;
  districtName = '';

  district: Church | null = null;
  churches: Church[] = [];
  private readonly loadingChurchesState = signal(false);
  get loadingChurches(): boolean {
    return this.loadingChurchesState();
  }
  set loadingChurches(value: boolean) {
    this.loadingChurchesState.set(value);
  }

  errorMessage = '';

ngOnInit(): void {
  this.loadChurches();
}

loadChurches(): void {
  this.errorMessage = '';
  this.loadingChurches = true;
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

      console.log('[REPORT DETAILS] District:', this.districtName);
      console.log('[REPORT DETAILS] Church count:', this.churches.length);
      console.log('[REPORT DETAILS] Churches:', this.churches);

      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('[REPORT DETAILS] API error:', error);

      this.churches = [];
      this.district = null;
      this.loadingChurches = false;
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

  getMonitoring(churchId: number) {
    const monitoring = this.churches.find(
      church => church.church_id === churchId
    )?.monitoring;

    return {
      q1: { progress: monitoring?.q1 ?? null, approved: !!monitoring?.q1_approved },
      q2: { progress: monitoring?.q2 ?? null, approved: !!monitoring?.q2_approved },
      q3: { progress: monitoring?.q3 ?? null, approved: !!monitoring?.q3_approved },
      q4: { progress: monitoring?.q4 ?? null, approved: !!monitoring?.q4_approved }
    };
  }

}