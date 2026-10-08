import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

interface Baptism {
  baptism_id: number;
  church_id: number;

  first_name: string;
  middle_name: string | null;
  last_name: string;
  extension_name: string | null;

  birthdate: string;
  gender: string;
  marital_status: string;
}

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

@Component({
  selector: 'app-deathaddrec',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './deathaddrec.html',
  styleUrls: ['./deathaddrec.css']
})
export class DeathaddrecComponent implements OnInit {

  private http = inject(HttpClient);
  private router = inject(Router);

  baptisms: Baptism[] = [];

  churches: Church[] = [];

  selectedBaptism: Baptism | null = null;

  loadingBaptisms = false;

  saving = false;

  death = {
    baptism_id: null as number | null,
    date_of_death: ''
  };


  ngOnInit(): void {

    this.loadBaptisms();

    this.loadChurches();

  }


  /**
   * Load baptism records.
   */
  loadBaptisms(): void {

    this.loadingBaptisms = true;

    this.http
      .get<any>(
        'http://127.0.0.1:8000/api/baptisms'
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Baptism response:',
            response
          );

          const data =
            response?.data ?? response;

          this.baptisms =
            Array.isArray(data)
              ? data
              : [];

          this.loadingBaptisms = false;

        },

        error: (error) => {

          console.error(
            'Failed to load baptism records:',
            error
          );

          this.baptisms = [];

          this.loadingBaptisms = false;

          alert(
            'Unable to load baptism records.'
          );

        }

      });

  }


  /**
   * Load churches.
   */
  loadChurches(): void {

    this.http
      .get<any>(
        'http://127.0.0.1:8000/api/churches'
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Church response:',
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
   * Select a baptized member.
   */
  selectBaptism(
    baptismId: number | null
  ): void {

    if (
      baptismId === null ||
      baptismId === undefined
    ) {

      this.selectedBaptism = null;
      this.death.baptism_id = null;

      return;

    }

    const selectedId =
      Number(baptismId);

    this.death.baptism_id =
      selectedId;

    this.selectedBaptism =
      this.baptisms.find(
        baptism =>
          Number(
            baptism.baptism_id
          ) === selectedId
      ) ?? null;

    console.log(
      'Selected baptism:',
      this.selectedBaptism
    );

  }


  /**
   * Get full name.
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
   * Get church name.
   */
  getChurchName(
    churchId: number | undefined
  ): string {

    if (
      churchId === undefined ||
      churchId === null
    ) {

      return '';

    }

    const church =
      this.churches.find(
        item =>
          Number(
            item.church_id
          ) === Number(churchId)
      );

    return church
      ? church.name
      : 'Unknown Church';

  }


  /**
   * Calculate age.
   */
  calculateAge(
    birthdate: string
  ): number | string {

    if (!birthdate) {

      return '';

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

      return '';

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


  /**
   * Save death record.
   */
  saveDeath(): void {

    if (
      this.death.baptism_id === null ||
      !this.death.date_of_death
    ) {

      alert(
        'Please select a baptized member and enter the date of death.'
      );

      return;

    }


    const baptismId =
      Number(
        this.death.baptism_id
      );


    if (
      !Number.isInteger(baptismId) ||
      baptismId <= 0
    ) {

      alert(
        'Invalid baptism record selected.'
      );

      return;

    }


    /*
     * Your deaths table contains only:
     *
     * death_id
     * baptism_id
     * date_of_death
     *
     * So these are the only fields sent.
     */
    const payload = {

      baptism_id:
        baptismId,

      date_of_death:
        this.death.date_of_death

    };


    console.log(
      'Sending death payload:',
      payload
    );


    this.saving = true;


    this.http
      .post<any>(
        'http://127.0.0.1:8000/api/deaths',
        payload
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Death save response:',
            response
          );

          this.saving = false;

          alert(
            'Death record saved successfully.'
          );

          this.router.navigate([
            '/pastor/deathbap'
          ]);

        },

        error: (error) => {

          console.error(
            'Death save error:',
            error
          );

          this.saving = false;


          if (
            error.status === 422 &&
            error.error?.errors
          ) {

            const validationErrors =
              Object.values(
                error.error.errors
              )
              .flat()
              .join('\n');

            alert(
              validationErrors
            );

            return;

          }


          if (
            error.error?.error
          ) {

            alert(
              error.error.error
            );

            return;

          }


          if (
            error.error?.message
          ) {

            alert(
              error.error.message
            );

            return;

          }


          if (
            error.status === 0
          ) {

            alert(
              'Cannot connect to Laravel. ' +
              'Make sure php artisan serve is running.'
            );

            return;

          }


          alert(
            'Failed to save death record.'
          );

        }

      });

  }

}
