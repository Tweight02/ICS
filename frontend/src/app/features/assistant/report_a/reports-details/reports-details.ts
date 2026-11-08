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
import { Button } from '../../../../shared/components/button/button';
import { QuarterStatus } from '../../../../shared/reports/quarter-status/quarter-status';
import {
  captureReportReturnQueryParams,
  clearReportReturnQueryParams
} from '../../../../shared/utils/report-navigation';

@Component({
  selector: 'app-reports-details',
  standalone: true,
  imports: [CommonModule, Button, QuarterStatus],
  templateUrl: '../../../../shared/reports/reports-details/reports-details.html'
})
export class ReportsDetails implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private churchService = inject(ChurchService);
  private reportReturnQueryParams: Record<string, string> = {};

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
    this.reportReturnQueryParams = captureReportReturnQueryParams(this.route);
    clearReportReturnQueryParams(this.router, this.route);

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'District ID was not provided.';
      return;
    }

    this.districtId = Number(id);

    this.loadChurches();
  }

  loadChurches(): void {
    this.loadingChurches = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.churchService.getChurches(this.districtId).subscribe({

      next: (response) => {
        this.loadingChurches = false;

        this.district = response.district;

        this.districtName =
          response.district?.name || '';

        this.churches =
          Array.isArray(response.data)
            ? response.data
            : [];

        console.log(
          '[REPORT DETAILS] District:',
          this.district
        );

        console.log(
          '[REPORT DETAILS] Churches:',
          this.churches
        );

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          '[REPORT DETAILS] API error:',
          error
        );

        this.district = null;
        this.churches = [];
        this.loadingChurches = false;

        this.errorMessage =
          'Unable to load district details.';

        this.cdr.detectChanges();
      }

    });

  }

  openDepartmentReports(): void {

    this.router.navigate(
      [`${this.portalPrefix()}/reports/programs`],
      {
        queryParams: {
          district_id: this.districtId,
          district_name: this.districtName,
          ...this.monitoringReturnParams()
        }
      }
    );

  }

  backToDistricts(): void {

    this.router.navigate(
      [`${this.portalPrefix()}/reports`],
      { queryParams: this.monitoringReturnParams() }
    );

  }

  openChurch(church: Church): void {

    console.log(
      '[REPORT DETAILS] Opening church:',
      church
    );

    this.router.navigate(
      [
        `${this.portalPrefix()}/reports/programs`,
        this.districtId,
        church.church_id
      ],
      {
        queryParams: {
          district_id: this.districtId,
          district_name: this.districtName,
          church_id: church.church_id,
          church_name: church.name,
          ...this.monitoringReturnParams()
        }
      }
    );

  }

  private monitoringReturnParams(): Record<string, string> {
    return { ...this.reportReturnQueryParams };
  }

  private portalPrefix(): '/director' | '/assistant' {
    return this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';
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