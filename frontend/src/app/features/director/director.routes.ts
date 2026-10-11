import { Routes } from '@angular/router';

export const DIRECTOR_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'reports',
    pathMatch: 'full'
  },

  {
    path: 'reports',
    loadComponent: () =>
      import('./report_d/reports/reports')
        .then(m => m.Reports)
  },

  {
    path: 'reports/details/:id',
    loadComponent: () =>
      import('./report_d/reports-details/reports-details')
        .then(m => m.ReportsDetails)
  },

  {
    path: 'reports/programs',
    loadComponent: () =>
      import('./report_d/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },

//   {
//     path: 'events',
//     loadComponent: () =>
//       import('./events/events')
//         .then(m => m.Events)
//   },



  {
    path: '**',
    redirectTo: 'reports'
  }
];