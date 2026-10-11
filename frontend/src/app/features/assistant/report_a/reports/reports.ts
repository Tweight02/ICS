import {
  Component,
  OnInit,
  NgZone,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { from } from 'rxjs';
import { map, mergeMap, toArray } from 'rxjs/operators';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import { ReportMonitoring } from '../../../../core/models/report.model';
import { ReportService } from '../../../../core/services/report/report';

@Component({
  selector: 'app-reports',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {

  private readonly churchService =
    inject(ChurchService);

  private readonly reportService =
    inject(ReportService);

  private readonly router =
    inject(Router);

  private readonly zone =
    inject(NgZone);

  private readonly cdr =
    inject(ChangeDetectorRef);

  districts: Church[] = [];
  churchCount = 0;
  monitoring: Record<number, ReportMonitoring> = {};
  loadingMonitoring = false;
  private readonly monitoringConcurrency = 3;

  loadingDistricts = false;

  errorMessage = '';

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.loadingDistricts = true;
    this.errorMessage = '';

    console.log('[REPORTS] Loading districts...');

    this.cdr.detectChanges();

    this.churchService
      .getDistricts()
      .subscribe({
        next: (response) => {

          console.log(
            '[REPORTS] District API response:',
            response
          );

          this.zone.run(() => {

            if (
              response &&
              response.success &&
              Array.isArray(response.data)
            ) {

              this.districts = [
                ...response.data
              ];

              console.log(
                '[REPORTS] Districts loaded:',
                this.districts.length
              );

            } else {

              this.districts = [];

              this.errorMessage =
                'Unable to load districts.';
            }

            this.loadingDistricts = false;
            this.loadDistrictMonitoring();

            console.log(
              '[REPORTS] District loading finished'
            );

            this.cdr.detectChanges();
          });
        },

        error: (error) => {

          console.error(
            '[REPORTS] District API error:',
            error
          );

          this.zone.run(() => {

            this.districts = [];

            this.loadingDistricts = false;

            this.errorMessage =
              'Unable to connect to the district server.';

            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadDistrictMonitoring(): void {
    this.monitoring = {};
    this.churchCount = 0;

    if (this.districts.length === 0) {
      this.loadingMonitoring = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingMonitoring = true;
    this.cdr.detectChanges();
    from(this.districts).pipe(
      mergeMap(
        district =>
          this.reportService
            .getDistrictMonitoring(district.church_id)
            .pipe(map(summary => ({ districtId: district.church_id, summary }))),
        this.monitoringConcurrency
      ),
      toArray()
    ).subscribe({
      next: results => {
        results.forEach(({ districtId, summary }) => {
          this.monitoring[districtId] = summary.monitoring;
          this.churchCount += summary.churchCount;
        });
        this.loadingMonitoring = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Unable to load district report monitoring:', error);
        this.loadingMonitoring = false;
        this.errorMessage = 'Unable to load report monitoring. Please retry.';
        this.cdr.detectChanges();
      }
    });
  }

  getMonitoring(district: Church): ReportMonitoring {
    return this.monitoring[district.church_id] ?? {
      q1: null,
      q2: null,
      q3: null,
      q4: null
    };
  }

  openDistrict(
    districtid: number
  ): void {


    const prefix = this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';

    this.router.navigate([`${prefix}/reports/details`, districtid]);
  }

  get districtCount(): number {
    return this.districts.length;
  }
}