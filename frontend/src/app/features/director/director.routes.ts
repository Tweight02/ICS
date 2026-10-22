import { Routes } from '@angular/router';
export const DIRECTOR_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'events',
    pathMatch: 'full'
  },

  {
    path: 'reports',
    loadComponent: () =>
      import('../assistant/report_a/reports/reports')
        .then(m => m.Reports)
  },

  {
    path: 'reports/details/:id',
    loadComponent: () =>
      import('../assistant/report_a/reports-details/reports-details')
        .then(m => m.ReportsDetails)
  },

  {
    path: 'reports/programs/:districtId/:churchId',
    loadComponent: () =>
      import('../pastor/report_p/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },

  {
    path: 'reports/programs',
    loadComponent: () =>
      import('../pastor/report_p/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },

  {
    path: 'reports/records/:departmentId/:districtId/:churchId',
    loadComponent: () =>
      import('../pastor/personalreport/deathbap/deathbap')
        .then(m => m.DeathbapComponent)
  },

  {
    path: 'reports/particulars/:departmentId/:districtId/:churchId',
    loadComponent: () =>
      import('../pastor/report_p/report-particulars/report-particulars')
        .then(m => m.ReportParticulars)
  },

  {
    path: 'reports/particulars/:departmentId',
    loadComponent: () =>
      import('../pastor/report_p/report-particulars/report-particulars')
        .then(m => m.ReportParticulars)
  },
  // director.routes.ts
  {
  path: 'events',
  loadComponent: () =>
    import('./events/events.routes')
      .then(m => m.DirectorEventsComponent)
}


];
