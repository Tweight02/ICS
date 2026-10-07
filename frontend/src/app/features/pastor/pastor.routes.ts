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
      import('./report_p/reports/reports')
        .then(m => m.Reports)
  },

  {
    path: 'reports/details/:id',
    loadComponent: () =>
      import('./report_p/reports-details/reports-details')
        .then(m => m.ReportsDetails)
  },

  {
    path: 'reports/programs',
    loadComponent: () =>
      import('./report_p/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },

  {
    path: 'events',
    loadComponent: () =>
      import('./events/events')
        .then(m => m.Events)
  },

  {
    path: 'baptism',
    loadComponent: () =>
      import('./personalreport/baptism/baptism.component')
        .then(m => m.BaptismComponent)
  },

  {
    path: 'death',
    loadComponent: () =>
      import('./personalreport/death/death.component')
        .then(m => m.DeathComponent)
  },

  {
    path: 'church-role',
    loadComponent: () =>
      import('./church-role/church-role')
        .then(m => m.ChurchRole)
  },

  {
    path: 'stewardship',
    loadComponent: () =>
      import('./stewardship/stewardship')
        .then(m => m.Stewardship)
  },

  {
    path: '**',
    redirectTo: 'reports'
  }
];