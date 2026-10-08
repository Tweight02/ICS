import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';

interface Baptism {
  baptism_id: number;
  church_id: number;

  first_name: string;
  middle_name: string | null;
  last_name: string;
  extension_name: string | null;

  birthdate: string;
  gender: string;

  address: string;
  officiating_minister: string;
  place_of_baptism: string;

  date_of_baptism: string;

  marital_status: string;

  is_reclaimed: boolean;
}

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

@Component({
  selector: 'app-deathbap',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './deathbap.html',
  styleUrls: ['./deathbap.css']
})
export class DeathbapComponent implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  selectedRecord: 'baptism' | 'death' = 'baptism';

  baptisms: Baptism[] = [];

  churches: Church[] = [];

  loadingBaptisms: boolean = false;

  baptismError: string = '';

  ngOnInit(): void {

    this.loadChurches();

    this.loadBaptisms();

  }


  /**
   * Select Baptism or Death record.
   */
  selectRecord(
    record: 'baptism' | 'death'
  ): void {

    this.selectedRecord = record;

  }


  /**
   * Load Baptism records from Laravel.
   */
  loadBaptisms(): void {

    this.loadingBaptisms = true;

    this.baptismError = '';

    console.log(
      'Loading baptism records...'
    );

    this.http
      .get<any>(
        'http://127.0.0.1:8000/api/baptisms'
      )
      .pipe(

        timeout(10000),

        finalize(() => {

          this.loadingBaptisms = false;

          console.log(
            'Finished loading baptism records.'
          );

        })

      )
      .subscribe({

        next: (response) => {

          console.log(
            'Baptism API response:',
            response
          );

          const data =
            response?.data ?? response;

          if (Array.isArray(data)) {

            this.baptisms =
              data;

            console.log(
              'Baptism records loaded:',
              this.baptisms
            );
            this.loadingBaptisms=false
            this.cdr.detectChanges()
          } else {

            this.baptisms = [];

            this.baptismError =
              'The server returned an invalid baptism record response.';

            console.error(
              'Invalid baptism response:',
              response
            );

          }

        },

        error: (error) => {

          console.error(
            'Failed to load baptism records:',
            error
          );

          this.baptisms = [];

          if (
            error?.name === 'TimeoutError' ||
            error?.message?.includes('timeout')
          ) {

            this.baptismError =
              'The Laravel server took too long to respond.';

          } else if (
            error?.status === 0
          ) {

            this.baptismError =
              'Cannot connect to Laravel. Make sure php artisan serve is running and CORS is configured.';

          } else if (
            error?.status === 404
          ) {

            this.baptismError =
              'The baptism API endpoint was not found.';

          } else if (
            error?.error?.message
          ) {

            this.baptismError =
              error.error.message;

          } else {

            this.baptismError =
              'Failed to load baptism records.';

          }

        }

      });

  }


  /**
   * Load Churches from Laravel.
   */
  loadChurches(): void {

    console.log(
      'Loading churches...'
    );

    this.http
      .get<any>(
        'http://127.0.0.1:8000/api/churches'
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Church API response:',
            response
          );

          const data =
            response?.data ?? response;

          if (Array.isArray(data)) {

            this.churches =
              data.map(
                (church: any): Church => ({

                  church_id:
                    Number(
                      church.church_id
                    ),

                  name:
                    church.name ?? '',

                  address:
                    church.address ?? '',

                  parent_id:
                    church.parent_id !== null &&
                    church.parent_id !== undefined
                      ? Number(
                          church.parent_id
                        )
                      : null

                })
              );

          } else {

            this.churches = [];

          }

          console.log(
            'Churches loaded:',
            this.churches
          );

        },

        error: (error) => {

          console.error(
            'Failed to load churches:',
            error
          );

          this.churches = [];

        }

      });

  }


  /**
   * Get Church name by church ID.
   */
  getChurchName(
    churchId: number
  ): string {

    const church =
      this.churches.find(
        item =>
          Number(item.church_id) ===
          Number(churchId)
      );

    if (church) {

      return church.name;

    }

    return 'Unknown Church';

  }


  /**
   * Build the full member name.
   */
  getFullName(
    baptism: Baptism
  ): string {

    const parts: string[] = [];

    if (
      baptism.first_name &&
      baptism.first_name.trim()
    ) {

      parts.push(
        baptism.first_name.trim()
      );

    }

    if (
      baptism.middle_name &&
      baptism.middle_name.trim()
    ) {

      parts.push(
        baptism.middle_name.trim()
      );

    }

    if (
      baptism.last_name &&
      baptism.last_name.trim()
    ) {

      parts.push(
        baptism.last_name.trim()
      );

    }

    if (
      baptism.extension_name &&
      baptism.extension_name.trim()
    ) {

      parts.push(
        baptism.extension_name.trim()
      );

    }

    return parts.join(' ');

  }


  /**
   * Format database date.
   */
  formatDate(
    date: string
  ): string {

    if (!date) {

      return '—';

    }

    const parsedDate =
      new Date(
        date + 'T00:00:00'
      );

    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {

      return date;

    }

    return parsedDate.toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }
    );

  }


  /**
   * Calculate age from birthdate.
   */
  calculateAge(
    birthdate: string
  ): number | string {

    if (!birthdate) {

      return '—';

    }

    const birthDate =
      new Date(
        birthdate + 'T00:00:00'
      );

    if (
      isNaN(
        birthDate.getTime()
      )
    ) {

      return '—';

    }

    const today =
      new Date();

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() <
        birthDate.getDate()
      )
    ) {

      age--;

    }

    return age;

  }

}
