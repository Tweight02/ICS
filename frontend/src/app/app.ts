import {
  Component,
  inject
} from '@angular/core';

import {
  Router,
  RouterOutlet
} from '@angular/router';

import {
  SidebarComponent
} from './shared/components/sidebar/sidebar';

import { User } from './core/models/user.model';


/*
|--------------------------------------------------------------------------
| TEMPORARY CURRENT USER
|--------------------------------------------------------------------------
|
| There is no login system yet.
|
| This matches your database:
|
| user_id      = 1
| department_id = 1
| church_id     = 1
| first_name   = Juan
| middle_name  = Santos
| last_name    = Dela Cruz
| role         = District Pastor
|
| Angular uses:
|
| role = 'pastor'
|
| because UserRole only accepts:
|
| pastor
| representative
| assistant
| director
| events
|
*/

const CURRENT_USER: User = {

  user_id: 1,

  department_id: 1,

  church_id: 1,

  first_name: 'Juan',

  middle_name: 'Santos',

  last_name: 'Dela Cruz',

  extension_name: null,

  birthdate: '1980-05-15',

  gender: 'Male',

  email: 'district.pastor@example.com',

  role: 'pastor'

};


@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    SidebarComponent
  ],

  templateUrl: './app.html',

  styleUrl: './app.css'
})
export class App {

  private readonly router =
    inject(Router);


  /*
  |--------------------------------------------------------------------------
  | CURRENT USER
  |--------------------------------------------------------------------------
  */

  currentUser: User =
    CURRENT_USER;


  /*
  |--------------------------------------------------------------------------
  | SIDEBAR COLLAPSED
  |--------------------------------------------------------------------------
  */

  collapsed = false;


  /*
  |--------------------------------------------------------------------------
  | CHECK IF PASTOR AREA
  |--------------------------------------------------------------------------
  */

  get isPastorArea(): boolean {

    return this.router.url
      .startsWith('/pastor');

  }


  /*
  |--------------------------------------------------------------------------
  | SHOW SIDEBAR
  |--------------------------------------------------------------------------
  |
  | There is no login yet, so always show the sidebar.
  |
  */

  get showSidebar(): boolean {

    return true;

  }

}