import {
  Component,
  OnInit,
  NgZone,
  ChangeDetectorRef,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';

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

  private readonly loadingDistrictsState = signal(false);
  get loadingDistricts(): boolean {
    return this.loadingDistrictsState();
  }
  set loadingDistricts(value: boolean) {
    this.loadingDistrictsState.set(value);
  }

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

  getMonitoring(district: Church): {
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
  } {
    return {
      q1: district.q1 ?? null,
      q2: district.q2 ?? null,
      q3: district.q3 ?? null,
      q4: district.q4 ?? null
    };
  }

  get churchCount(): number {
    return this.districts.reduce(
      (count, district) => count + (district.church_count ?? 0),
      0
    );
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