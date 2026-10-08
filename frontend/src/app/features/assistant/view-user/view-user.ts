import {
  DatePipe,
  TitleCasePipe
} from '@angular/common';

import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  debounceTime,
  distinctUntilChanged,
  Subject
} from 'rxjs';

import Swal from 'sweetalert2';

import {
  UserService
} from '../../../core/services/user/user-service';

import {
  Pastor
} from '../../../core/models/pastor.model';

import {
  Church
} from '../../../core/models/church.model';

import {
  RouterLink
} from '@angular/router';

@Component({
  imports: [
    DatePipe,
    TitleCasePipe,
    RouterLink
  ],

  selector: 'app-view-user',

  styleUrl: './view-user.css',

  templateUrl: './view-user.html',
})
export class ViewUser implements OnInit {

  private userService = inject(UserService);

  private destroyRef = inject(DestroyRef);

  private search$ = new Subject<string>();

  // =========================================================
  // EXISTING DATA
  // =========================================================

  pastors = signal<Pastor[]>([]);

  districts = signal<Church[]>([]);

  loading = signal(false);

  error = signal<string | null>(null);

  search = signal('');

  churchId = signal('');

  page = signal(1);

  lastPage = signal(1);

  total = signal(0);

  from = signal(0);

  to = signal(0);

  readonly perPage = 15;


  // =========================================================
  // BULK TRANSFER
  // =========================================================

  bulkMode = signal(false);

  selectedPastorIds = signal<number[]>([]);

  transferMode = signal<'same' | 'individual'>('same');

  bulkDestination = signal<number | null>(null);

  individualDestinations = signal<Record<number, number | null>>({});

  savingTransfer = signal(false);


  // =========================================================
  // INITIALIZATION
  // =========================================================

  ngOnInit() {

    this.userService
      .getDistricts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (res) => {

          this.districts.set(
            res.data
          );

        },

        error: (error) => {

          console.error(
            'Failed to load districts:',
            error
          );

        }

      });


    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {

        this.search.set(value);

        this.page.set(1);

        this.loadPastors();

      });


    this.loadPastors();

  }


  // =========================================================
  // LOAD PASTORS
  // =========================================================

  loadPastors() {

    this.loading.set(true);

    this.error.set(null);

    this.userService
      .getPastors({

        search: this.search(),

        church_id: this.churchId(),

        page: this.page(),

        per_page: this.perPage

      })
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: (res) => {

          this.pastors.set(
            res.data
          );

          this.page.set(
            res.current_page
          );

          this.lastPage.set(
            res.last_page
          );

          this.total.set(
            res.total
          );

          this.from.set(
            res.from ?? 0
          );

          this.to.set(
            res.to ?? 0
          );

          this.loading.set(false);

        },

        error: (error) => {

          console.error(
            'Failed to load pastors:',
            error
          );

          this.error.set(
            'Failed to load users. Please try again.'
          );

          this.loading.set(false);

        },

      });

  }


  // =========================================================
  // SEARCH / FILTER
  // =========================================================

  onSearch(value: string) {

    this.search$.next(
      value.trim()
    );

  }


  onDistrictChange(value: string) {

    this.churchId.set(
      value
    );

    this.page.set(1);

    this.loadPastors();

  }


  // =========================================================
  // PAGINATION
  // =========================================================

  prevPage() {

    if (this.page() > 1) {

      this.page.update(
        p => p - 1
      );

      this.loadPastors();

    }

  }


  nextPage() {

    if (
      this.page() <
      this.lastPage()
    ) {

      this.page.update(
        p => p + 1
      );

      this.loadPastors();

    }

  }


  // =========================================================
  // DISPLAY HELPERS
  // =========================================================

  fullName(p: Pastor) {

    return [
      p.first_name,
      p.middle_name,
      p.last_name,
      p.extension_name
    ]
      .filter(Boolean)
      .join(' ');

  }


  initials(p: Pastor) {

    return (
      (p.first_name?.[0] ?? '') +
      (p.last_name?.[0] ?? '')
    ).toUpperCase();

  }


  genderBadge(p: Pastor) {

    return p.gender === 'female'
      ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
      : 'bg-sky-50 text-sky-700 ring-sky-600/15';

  }


  // =========================================================
  // ENTER / EXIT BULK MODE
  // =========================================================

  enterBulkMode() {

    this.bulkMode.set(true);

    this.selectedPastorIds.set([]);

    this.transferMode.set('same');

    this.bulkDestination.set(null);

    this.individualDestinations.set({});

  }


  cancelBulkMode() {

    this.bulkMode.set(false);

    this.selectedPastorIds.set([]);

    this.bulkDestination.set(null);

    this.individualDestinations.set({});

  }


  // =========================================================
  // PASTOR SELECTION
  // =========================================================

  isSelected(userId: number): boolean {

    return this.selectedPastorIds()
      .includes(userId);

  }


  togglePastor(
    userId: number
  ) {

    const selected =
      [...this.selectedPastorIds()];

    const index =
      selected.indexOf(userId);

    if (index === -1) {

      selected.push(userId);

    } else {

      selected.splice(
        index,
        1
      );

    }

    this.selectedPastorIds.set(
      selected
    );

  }


  allVisibleSelected(): boolean {

    const visible =
      this.pastors();

    if (!visible.length) {

      return false;

    }

    return visible.every(
      pastor =>
        this.isSelected(
          pastor.user_id
        )
    );

  }


  toggleAllVisible() {

    const selected =
      [...this.selectedPastorIds()];

    if (this.allVisibleSelected()) {

      this.pastors().forEach(
        pastor => {

          const index =
            selected.indexOf(
              pastor.user_id
            );

          if (index !== -1) {

            selected.splice(
              index,
              1
            );

          }

        }
      );

    } else {

      this.pastors().forEach(
        pastor => {

          if (
            !selected.includes(
              pastor.user_id
            )
          ) {

            selected.push(
              pastor.user_id
            );

          }

        }
      );

    }

    this.selectedPastorIds.set(
      selected
    );

  }


  selectedCount(): number {

    return this.selectedPastorIds().length;

  }


  // =========================================================
  // TRANSFER MODE
  // =========================================================

  setTransferMode(
    mode: 'same' | 'individual'
  ) {

    this.transferMode.set(
      mode
    );

    this.bulkDestination.set(
      null
    );

    this.individualDestinations.set(
      {}
    );

  }


  // =========================================================
  // SAME DISTRICT DESTINATION
  // =========================================================

  selectBulkDestination(
    value: string
  ) {

    this.bulkDestination.set(
      value
        ? Number(value)
        : null
    );

  }


  // =========================================================
  // INDIVIDUAL DESTINATIONS
  // =========================================================

  updateIndividualDestination(
    userId: number,
    value: string
  ) {

    const destinations = {
      ...this.individualDestinations()
    };

    destinations[userId] =
      value
        ? Number(value)
        : null;

    this.individualDestinations.set(
      destinations
    );

  }


  getIndividualDestination(
    userId: number
  ): number | null {

    return (
      this.individualDestinations()[userId]
      ?? null
    );

  }


  // =========================================================
  // VALIDATION
  // =========================================================

  validateTransfer(): boolean {

    if (
      this.selectedCount() === 0
    ) {

      Swal.fire({

        icon: 'warning',

        title: 'No pastors selected',

        text:
          'Please select at least one pastor.',

        confirmButtonColor:
          '#0F4A30'

      });

      return false;

    }


    // -------------------------------------------------------
    // SAME DISTRICT
    // -------------------------------------------------------

    if (
      this.transferMode() === 'same'
    ) {

      if (
        !this.bulkDestination()
      ) {

        Swal.fire({

          icon: 'warning',

          title: 'Select a district',

          text:
            'Please select the district where the selected pastors will be transferred.',

          confirmButtonColor:
            '#0F4A30'

        });

        return false;

      }


      const destination =
        this.bulkDestination();


      const alreadyThere =
        this.pastors()
          .filter(p =>
            this.selectedPastorIds()
              .includes(
                p.user_id
              )
          )
          .some(
            p =>
              p.church_id ===
              destination
          );


      if (alreadyThere) {

        Swal.fire({

          icon: 'warning',

          title: 'Invalid transfer',

          text:
            'One or more selected pastors are already assigned to the selected district.',

          confirmButtonColor:
            '#0F4A30'

        });

        return false;

      }

    }


    // -------------------------------------------------------
    // INDIVIDUAL DISTRICTS
    // -------------------------------------------------------

    if (
      this.transferMode() === 'individual'
    ) {

      const incomplete =
        this.selectedPastorIds()
          .some(
            userId =>
              !this.getIndividualDestination(
                userId
              )
          );


      if (incomplete) {

        Swal.fire({

          icon: 'warning',

          title: 'Incomplete assignment',

          text:
            'Please select a new district for every selected pastor.',

          confirmButtonColor:
            '#0F4A30'

        });

        return false;

      }


      const unchanged =
        this.pastors()
          .filter(p =>
            this.selectedPastorIds()
              .includes(
                p.user_id
              )
          )
          .some(
            pastor =>
              pastor.church_id ===
              this.getIndividualDestination(
                pastor.user_id
              )
          );


      if (unchanged) {

        Swal.fire({

          icon: 'warning',

          title: 'Invalid transfer',

          text:
            'A pastor cannot be transferred to their current district.',

          confirmButtonColor:
            '#0F4A30'

        });

        return false;

      }

    }


    return true;

  }


  // =========================================================
  // BUILD TRANSFER LIST
  // =========================================================

  buildTransfers() {

    if (
      this.transferMode() === 'same'
    ) {

      const destination =
        this.bulkDestination();

      return this.pastors()
        .filter(p =>
          this.selectedPastorIds()
            .includes(
              p.user_id
            )
        )
        .map(p => ({

          user_id:
            p.user_id,

          pastorName:
            this.fullName(p),

          fromDistrict:
            p.church?.name ??
            'Unassigned',

          toDistrict:
            this.districts()
              .find(
                d =>
                  d.church_id ===
                  destination
              )?.name ??
            'Unknown',

          church_id:
            destination as number

        }));

    }


    return this.pastors()
      .filter(p =>
        this.selectedPastorIds()
          .includes(
            p.user_id
          )
      )
      .map(p => {

        const destination =
          this.getIndividualDestination(
            p.user_id
          );

        return {

          user_id:
            p.user_id,

          pastorName:
            this.fullName(p),

          fromDistrict:
            p.church?.name ??
            'Unassigned',

          toDistrict:
            this.districts()
              .find(
                d =>
                  d.church_id ===
                  destination
              )?.name ??
            'Unknown',

          church_id:
            destination as number

        };

      });

  }


  // =========================================================
  // REVIEW + CONFIRM
  // =========================================================

  reviewTransfers() {

    if (
      !this.validateTransfer()
    ) {

      return;

    }


    const transfers =
      this.buildTransfers();


    const rows =
      transfers
        .map(
          transfer => `
            <tr>
              <td style="
                padding:8px;
                text-align:left;
                font-weight:500;
              ">
                ${transfer.pastorName}
              </td>

              <td style="
                padding:8px;
              ">
                ${transfer.fromDistrict}
              </td>

              <td style="
                padding:8px;
                color:#64748b;
              ">
                →
              </td>

              <td style="
                padding:8px;
                font-weight:600;
                color:#0F4A30;
              ">
                ${transfer.toDistrict}
              </td>
            </tr>
          `
        )
        .join('');


    Swal.fire({

      icon: 'question',

      title:
        `Review ${transfers.length} Transfer${
          transfers.length === 1
            ? ''
            : 's'
        }`,

      html: `
        <div style="
          max-height:350px;
          overflow:auto;
        ">

          <table style="
            width:100%;
            border-collapse:collapse;
            font-size:13px;
          ">

            <thead>

              <tr>

                <th style="
                  text-align:left;
                  padding:8px;
                ">
                  Pastor
                </th>

                <th style="padding:8px;">
                  From
                </th>

                <th></th>

                <th style="padding:8px;">
                  To
                </th>

              </tr>

            </thead>

            <tbody>

              ${rows}

            </tbody>

          </table>

        </div>
      `,

      showCancelButton: true,

      confirmButtonText:
        'Confirm Transfers',

      cancelButtonText:
        'Go Back',

      confirmButtonColor:
        '#0F4A30'

    }).then(result => {

      if (
        result.isConfirmed
      ) {

        this.executeTransfers();

      }

    });

  }


  // =========================================================
  // EXECUTE TRANSFER
  // =========================================================

  executeTransfers() {

    if (
      this.savingTransfer()
    ) {

      return;

    }


    const transfers =
      this.buildTransfers()
        .map(
          transfer => ({

            user_id:
              transfer.user_id,

            church_id:
              transfer.church_id

          })
        );


    this.savingTransfer.set(
      true
    );


    this.userService
      .bulkTransfer(
        transfers
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: (response) => {

          this.savingTransfer.set(
            false
          );


          Swal.fire({

            icon: 'success',

            title:
              'Transfers completed',

            text:
              response.message,

            confirmButtonColor:
              '#0F4A30'

          });


          this.cancelBulkMode();

          this.loadPastors();

        },


        error: (error) => {

          console.error(
            'Bulk transfer failed:',
            error
          );


          this.savingTransfer.set(
            false
          );


          Swal.fire({

            icon: 'error',

            title:
              'Transfer failed',

            text:
              error?.error?.message ??
              'The transfers could not be completed.',

            confirmButtonColor:
              '#0F4A30'

          });

        }

      });

  }

}