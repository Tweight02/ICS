import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
}

@Component({
  selector: 'app-bapaddrec',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './bapaddrec.html',
  styleUrls: ['./bapaddrec.css']
})
export class BapaddrecComponent implements OnInit {
  
  private http = inject(HttpClient);
  private router = inject(Router);

  churches: Church[] = [];

  age: number | null = null;

  private readonly savingState = signal(false);
  get saving(): boolean {
    return this.savingState();
  }
  set saving(value: boolean) {
    this.savingState.set(value);
  }

  baptism = {
    church_id: null as number | null,

    first_name: '',

    middle_name: '',

    last_name: '',

    extension_name: '',

    birthdate: '',

    gender: null as string | null,

    address: '',

    officiating_minister: '',

    place_of_baptism: '',

    date_of_baptism: '',

    marital_status: null as string | null,

    is_reclaimed: false
  };

  ngOnInit(): void {
    this.loadChurches();
  }

  /**
   * Load all churches directly from Laravel.
   */
  loadChurches(): void {

    const apiUrl =
      'http://127.0.0.1:8000/api/churches';

    console.log(
      'Loading churches from:',
      apiUrl
    );

    this.http
      .get<any>(apiUrl)
      .subscribe({

        next: (response) => {

          console.log(
            'Church API response:',
            response
          );

          const data =
            response?.data ?? response;

          if (!Array.isArray(data)) {

            console.error(
              'Church response is not an array:',
              response
            );

            this.churches = [];

            return;
          }

          this.churches =
            data.map(
              (church: any): Church => ({

                church_id:
                  Number(church.church_id),

                name:
                  church.name ?? '',

                address:
                  church.address ?? '',

                parent_id:
                  church.parent_id !== null &&
                  church.parent_id !== undefined
                    ? Number(church.parent_id)
                    : null

              })
            );

          console.log(
            'Churches loaded successfully:',
            this.churches
          );

        },

        error: (error) => {

          console.error(
            'Failed to load churches:',
            error
          );

          this.churches = [];

          if (error.status === 0) {

            alert(
              'Cannot connect to the Laravel server. ' +
              'Make sure php artisan serve is running.'
            );

          } else if (error.error?.message) {

            alert(
              error.error.message
            );

          } else {

            alert(
              'Failed to load churches from the database.'
            );

          }

        }

      });

  }

  /**
   * Calculate age from birthdate.
   */
  calculateAge(): void {

    if (!this.baptism.birthdate) {

      this.age = null;

      return;
    }

    const birthDate =
      new Date(this.baptism.birthdate);

    const today =
      new Date();

    let calculatedAge =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ) {

      calculatedAge--;
    }

    this.age = calculatedAge;
  }

  /**
   * Save baptism record.
   */
  saveBaptism(): void {

    if (
      !this.baptism.first_name.trim() ||
      !this.baptism.last_name.trim() ||
      !this.baptism.church_id ||
      !this.baptism.birthdate ||
      !this.baptism.date_of_baptism ||
      !this.baptism.gender ||
      !this.baptism.marital_status
    ) {

      alert(
        'Please complete all required fields.'
      );

      return;
    }

    /*
     * Make sure fields that cannot be NULL
     * in the database always contain a value.
     */
    this.baptism.first_name =
      this.baptism.first_name.trim();

    this.baptism.middle_name =
      this.baptism.middle_name?.trim() || '';

    this.baptism.last_name =
      this.baptism.last_name.trim();

    this.baptism.extension_name =
      this.baptism.extension_name?.trim() || '';

    this.saving = true;

    console.log(
      'Saving baptism:',
      this.baptism
    );

    this.http
      .post<any>(
        'http://127.0.0.1:8000/api/baptisms',
        this.baptism
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Baptism saved successfully:',
            response
          );

          alert(
            'Baptism record saved successfully.'
          );

          this.saving = false;

          this.router.navigate([
            '/pastor/deathbap'
          ]);

        },

        error: (error) => {

          console.error(
            'Error saving baptism:',
            error
          );

          this.saving = false;

          if (error.error?.errors) {

            const validationErrors =
              Object.values(
                error.error.errors
              )
              .flat()
              .join('\n');

            alert(
              validationErrors
            );

          } else if (error.error?.message) {

            alert(
              error.error.message
            );

          } else if (error.status === 0) {

            alert(
              'Cannot connect to the Laravel server. ' +
              'Make sure php artisan serve is running.'
            );

          } else {

            alert(
              'Failed to save baptism record.'
            );

          }

        }

      });

  }

}