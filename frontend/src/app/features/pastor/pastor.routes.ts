import { Routes } from '@angular/router';

import { BapaddrecComponent } from './personalreport/bapaddrec/bapaddrec';
import { DeathaddrecComponent } from './personalreport/deathaddrec/deathaddrec';
import { EditbapComponent } from './personalreport/editbap/editbap';

export const PASTOR_ROUTES: Routes = [
  // Default route
  {
    path: '',
    redirectTo: 'reports',
    pathMatch: 'full'
  },

  {
    path: 'reports/details',
    loadComponent: () =>
      import('./report_p/reports-details/reports-details')
        .then(m => m.ReportsDetails)
  },
  {
    path: 'reports/details/:id',
    loadComponent: () =>
      import('./report_p/reports-details/reports-details')
        .then(m => m.ReportsDetails)
  },
  {
    path: 'reports/programs/:districtId/:churchId',
    loadComponent: () =>
      import('./report_p/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },
  {
    path: 'reports/programs',
    loadComponent: () =>
      import('./report_p/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },
  {
    path: 'reports/particulars/:departmentId/:districtId/:churchId',
    loadComponent: () =>
      import('./report_p/report-particulars/report-particulars')
        .then(m => m.ReportParticulars)
  },
  {
    path: 'reports/particulars/:departmentId',
    loadComponent: () =>
      import('./report_p/report-particulars/report-particulars')
        .then(m => m.ReportParticulars)
  },

  // Events
  {
    path: 'events',
    loadComponent: () =>
      import('./events/events')
        .then(m => m.Events)
  },

  // Baptism Records - Existing route
  {
    path: 'baptism',
    loadComponent: () =>
      import('./personalreport/deathbap/deathbap')
        .then(m => m.DeathbapComponent)
  },

  // Death and Baptism Records - Route alias
  {
    path: 'deathbap',
    loadComponent: () =>
      import('./personalreport/deathbap/deathbap')
        .then(m => m.DeathbapComponent)
  },

  // Add Baptism Record
  {
    path: 'bapaddrec',
    component: BapaddrecComponent
  },

  // Add Death Record
  {
    path: 'deathaddrec',
    component: DeathaddrecComponent
  },

  // Edit the selected baptism record by ID
  {
    path: 'editbap/:id',
    component: EditbapComponent
  },

  // Preserve the existing edit route
  {
    path: 'editbap',
    component: EditbapComponent
  },

  // Church Role
  {
    path: 'church-role',
    loadComponent: () =>
      import('./church-role/church-role')
        .then(m => m.ChurchRole)
  },

  // View Representatives
  {
    path: 'view-representatives',
    loadComponent: () =>
      import('./user_management/view-representative/view-representative')
        .then(m => m.ViewRepresentative)
  },
  {
    path: 'view-representatives/:id/edit',
    loadComponent: () =>
      import('./user_management/edit-representative/edit-representative')
        .then(m => m.EditRepresentative)
  },
  {
    path: 'new-representative',
    loadComponent: () =>
      import('./user_management/new-representative/new-representative')
        .then(m => m.NewRepresentative)
  },

  // Fallback route — keep this last
  {
    path: '**',
    redirectTo: 'reports'
  }
];