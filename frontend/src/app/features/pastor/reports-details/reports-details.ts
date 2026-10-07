import {
  Component,
  ChangeDetectorRef,
  NgZone,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { ChurchService } from '../../../core/services/church/church-service';

import { Church } from '../../../core/models/church.model';


interface MonitoringRow {
  q1: boolean;
  q2: boolean;
  q3: number;
  q4: boolean;
}


@Component({
  selector: 'app-reports-details',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './reports-details.html',
  styleUrl: './reports-details.css'
})
export class ReportsDetails implements OnInit {

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly churchService =
    inject(ChurchService);

  private readonly zone =
    inject(NgZone);

  private readonly cdr =
    inject(ChangeDetectorRef);


  // ==============================
  // DATA
  // ==============================

  district: Church | null = null;

  churches: Church[] = [];

  loading = false;

  errorMessage = '';


  ngOnInit(): void {

    this.route.queryParamMap.subscribe(
      params => {

        const districtId =
          Number(
            params.get('district_id')
          );

        if (!districtId) {

          this.errorMessage =
            'No district was selected.';

          return;
        }

        this.loadDistrict(
          districtId
        );
      }
    );
  }


  // ==============================
  // LOAD PARENT + CHILDREN
  // ==============================

  loadDistrict(
    districtId: number
  ): void {

    this.loading = true;

    this.errorMessage = '';

    this.district = null;

    this.churches = [];


    console.log(
      '[REPORT DETAILS] Loading district:',
      districtId
    );


    this.churchService
      .getChurches(districtId)
      .subscribe({

        next: (response) => {

          console.log(
            '[REPORT DETAILS] API response:',
            response
          );


          this.zone.run(() => {

            if (
              response &&
              response.success
            ) {

              /*
               * THIS IS THE PARENT.
               */
              this.district =
                response.district;


              /*
               * These are the children
               * where parent_id =
               * district.church_id
               */
              this.churches =
                Array.isArray(
                  response.data
                )
                  ? response.data
                  : [];


              console.log(
                '[REPORT DETAILS] Parent district:',
                this.district
              );


              console.log(
                '[REPORT DETAILS] Churches:',
                this.churches
              );


            } else {

              this.errorMessage =
                'Unable to load district data.';

            }


            this.loading = false;

            this.cdr.detectChanges();

          });

        },


        error: (error) => {

          console.error(
            '[REPORT DETAILS] API error:',
            error
          );


          this.zone.run(() => {

            this.loading = false;

            this.district = null;

            this.churches = [];

            this.errorMessage =
              'Unable to load churches for this district.';

            this.cdr.detectChanges();

          });

        }

      });
  }


  // ==============================
  // BACK
  // ==============================

  backToDistricts(): void {

    this.router.navigate(
      ['/pastor/reports']
    );
  }


  // ==============================
  // OPEN CHURCH
  // ==============================

  openChurch(
    church: Church
  ): void {

    if (!this.district) {
      return;
    }


    console.log(
      '[REPORT DETAILS] Opening church:',
      church
    );


    /*
     * Send BOTH:
     *
     * parent district
     * selected church
     *
     * to the next report page.
     */

    this.router.navigate(
      ['/pastor/reports/details'],   // was '/pastor/reports-details'
      {
        queryParams: {
          district_id: this.district.church_id,
          church_id: church.church_id
        }
      }
    );
  }


  // ==============================
  // CHURCH COUNT
  // ==============================

  get churchCount(): number {

    return this.churches.length;
  }


  // ==============================
  // MONITORING
  // ==============================

  getMonitoring(
    index: number
  ): MonitoringRow {

    const values = [
      60,
      57,
      63,
      57,
      53,
      53,
      47,
      63,
      60,
      57,
      53,
      63
    ];

    return {

      q1: true,

      q2: true,

      q3:
        values[index] ??
        55,

      q4: false

    };
  }


  trackChurch(
    index: number,
    church: Church
  ): number {

    return church.church_id;
  }
}