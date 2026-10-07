import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  ChurchService
} from '../../../core/services/church/church-service';

import {
  Church
} from '../../../core/models/church.model';


interface ChurchMonitoring extends Church {

  q1: boolean;

  q2: boolean;

  q3: number | null;

  q4: number | null;

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
export class ReportsDetails
  implements OnInit {


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


  /*
   * =========================================================
   * DISTRICT
   * =========================================================
   */

  districtId: number | null = null;

  district: Church | null = null;


  /*
   * =========================================================
   * CHURCHES
   * =========================================================
   */

  churches: ChurchMonitoring[] = [];


  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  loading = false;

  errorMessage = '';


  /*
   * =========================================================
   * INIT
   * =========================================================
   */

  ngOnInit(): void {

    this.route.queryParamMap.subscribe(
      params => {

        const id =
          Number(
            params.get('district_id')
          );


        if (
          !id ||
          Number.isNaN(id)
        ) {

          this.errorMessage =
            'No district was selected.';

          return;

        }


        this.districtId = id;

        this.loadDistrict(id);

      }
    );

  }


  /*
   * =========================================================
   * LOAD DISTRICT + CHILDREN
   * =========================================================
   */

  loadDistrict(
    districtId: number
  ): void {

    this.loading = true;

    this.errorMessage = '';

    this.churches = [];


    this.churchService
      .getChurches(districtId)
      .subscribe({

        next: (response) => {

          console.log(
            'District / Church response:',
            response
          );


          this.zone.run(() => {

            if (
              response?.success
            ) {

              /*
               * Parent district
               */
              this.district =
                response.district;


              /*
               * Children
               */
              if (
                Array.isArray(
                  response.data
                )
              ) {

                this.churches =
                  response.data.map(
                    (church: Church) => {

                      return {

                        ...church,

                        q1: true,

                        q2: true,

                        q3:
                          this.getQ3Value(
                            church.church_id
                          ),

                        q4: null

                      };

                    }
                  );

              } else {

                this.churches = [];

              }

            } else {

              this.errorMessage =
                'Unable to load churches.';

            }


            this.loading = false;

            this.cdr.detectChanges();

          });

        },


        error: (error) => {

          console.error(
            'Church API error:',
            error
          );


          this.zone.run(() => {

            this.loading = false;

            this.churches = [];

            this.errorMessage =
              'Unable to load churches for this district.';

            this.cdr.detectChanges();

          });

        }

      });

  }


  /*
   * =========================================================
   * Q3 SAMPLE
   * =========================================================
   */

  private getQ3Value(
    id: number
  ): number {

    const values = [
      47,
      53,
      57,
      60,
      63
    ];

    return values[
      id % values.length
    ];

  }


  /*
   * =========================================================
   * OPEN CHURCH REPORT
   *
   * Only the individual church opens its
   * actual report details.
   * =========================================================
   */

  openChurch(
    church: ChurchMonitoring
  ): void {

    console.log(
      'Opening church:',
      church
    );


    this.router.navigate(
      [
        '/pastor/reports-details'
      ],
      {
        queryParams: {
          district_id:
            this.districtId,

          church_id:
            church.church_id
        }
      }
    );

  }


  /*
   * =========================================================
   * BACK
   * =========================================================
   */

  backToDistricts(): void {

    this.router.navigate(
      [
        '/pastor/reports'
      ]
    );

  }


  /*
   * =========================================================
   * RETRY
   * =========================================================
   */

  retry(): void {

    if (
      this.districtId
    ) {

      this.loadDistrict(
        this.districtId
      );

    }

  }


  /*
   * =========================================================
   * COUNT
   * =========================================================
   */

  get churchCount(): number {

    return this.churches.length;

  }

}