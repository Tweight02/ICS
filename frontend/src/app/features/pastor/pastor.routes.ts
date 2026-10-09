import { Routes } from '@angular/router';
import { BapaddrecComponent } from './personalreport/bapaddrec/bapaddrec';
import { DeathaddrecComponent } from './personalreport/deathaddrec/deathaddrec';

export const PASTOR_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'reports',
    pathMatch: 'full'
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
    import('./personalreport/deathbap/deathbap')
      .then(m => m.DeathbapComponent)
},

{
  path: 'bapaddrec',
  component: BapaddrecComponent
},

{
  path: 'deathaddrec',
  component: DeathaddrecComponent
},


  {
    path: 'church-role',
    loadComponent: () =>
      import('./church-role/church-role')
        .then(m => m.ChurchRole)
  },


  {
    path: '**',
    redirectTo: 'reports'
  }
];