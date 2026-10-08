import { Routes } from '@angular/router';

export const RepresentativeRoute: Routes = [
  // Default route
  {
    path: '',
    redirectTo: 'reports/programs',
    pathMatch: 'full'
  },

  // Reports > Programs
  {
    path: 'reports/programs',
    loadComponent: () =>
      import('./report_c/report-programs/report-programs')
        .then(m => m.ReportPrograms)
  },

  // Reports > Particulars
  {
    path: 'reports/particulars/:departmentId',
    loadComponent: () =>
      import('./report_c/report-particulars/report-particulars')
        .then(m => m.ReportParticulars)
  }
];