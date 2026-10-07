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
    path: 'reports/details',
    loadComponent: () =>
      import('./reports-details/reports-details').then(m => m.ReportsDetails)
  },

  {
    path: 'events',
    loadComponent: () =>
      import('./events/events').then(m => m.Events)
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
      import('./church-role/church-role').then(m => m.ChurchRole)
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