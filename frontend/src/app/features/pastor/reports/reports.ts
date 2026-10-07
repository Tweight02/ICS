import {
  Component,
  OnInit,
  NgZone,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ChurchService } from '../../../core/services/church/church-service';
import { Church } from '../../../core/models/church.model';

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

  private readonly router =
    inject(Router);

  private readonly zone =
    inject(NgZone);

  private readonly cdr =
    inject(ChangeDetectorRef);

  districts: Church[] = [];

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

  getMonitoringPercentage(
    _district: Church
  ): number {
    return 50;
  }

  openDistrict(
    districtid: number
  ): void {


    this.router.navigate([`pastor/reports/details/${districtid}`]);
  }

  get districtCount(): number {
    return this.districts.length;
  }
}