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
      import('./reports/reports').then(m => m.Reports)
  },

  {
    // nested under /reports so the Reports link stays highlighted
    path: 'reports/details/:id',
    loadComponent: () =>
      import('./reports-details/reports-details').then(m => m.ReportsDetails)
  },

  {
    path: 'events',
    loadComponent: () =>
      import('./events/events').then(m => m.Events)
  },

  // Uncomment once the components exist
  // {
  //   path: 'baptism',
  //   loadComponent: () =>
  //     import('./baptism/baptism').then(m => m.Baptism)
  // },

  // {
  //   path: 'death',
  //   loadComponent: () =>
  //     import('./death/death').then(m => m.Death)
  // },

  {
    path: 'church-role',
    loadComponent: () =>
      import('./church-role/church-role').then(m => m.ChurchRole)
  },

  // =====================================================
  // ADDED:
  // SELECTED CHURCH → DEPARTMENTS → REPORT
  // =====================================================
{
  path: 'reports/programs',
  loadComponent: () =>
    import('./report-programs/report-programs')
      .then(m => m.ReportPrograms)
},

  {
    path: 'stewardship',
    loadComponent: () =>
      import('./stewardship/stewardship').then(m => m.Stewardship)
  },

  // Temporary fallback so the Baptism and Death links don't break the app
  {
    path: '**',
    redirectTo: 'reports'
  }
];