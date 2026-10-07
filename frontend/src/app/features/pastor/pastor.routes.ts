import { Routes } from '@angular/router';

export const PASTOR_ROUTES: Routes = [

  {
    path: '',
    redirectTo: 'reports',
    pathMatch: 'full'
  },

  {
    path: 'reports',

    loadComponent: () =>
      import('./reports/reports')
        .then(m => m.Reports)
  },

  {
    path: 'reports-details',

    loadComponent: () =>
      import('./reports-details/reports-details')
        .then(m => m.ReportsDetails)
  },

  {
    path: 'events',

    loadComponent: () =>
      import('./events/events')
        .then(m => m.Events)
  },

  // {
  //   path: 'baptism',

  //   loadComponent: () =>
  //     import('./baptism/baptism')
  //       .then(m => m.Baptism)
  // },

  // {
  //   path: 'death',

  //   loadComponent: () =>
  //     import('./death/death')
  //       .then(m => m.Death)
  // },

  {
    path: 'stewardship',

    loadComponent: () =>
      import('./stewardship/stewardship')
        .then(m => m.Stewardship)
  },

  {
    path: 'church-role',

    loadComponent: () =>
      import('./church-role/church-role')
        .then(m => m.ChurchRole)
  }

];