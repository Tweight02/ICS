import {
  Routes
} from '@angular/router';


export const RepresentativeRoute: Routes = [

  {
    path: '',
    redirectTo: 'reports/programs',
    pathMatch: 'full'
  },


  {
    path: 'reports/programs',

    loadComponent: () =>
      import(
        './report_c/report-programs/report-programs'
      )
      .then(
        m => m.ReportPrograms
      )
  },


  {
    path: 'reports/particulars/:departmentId',

    loadComponent: () =>
      import(
        './report_c/report-particulars/report-particulars'
      )
      .then(
        m => m.ReportParticulars
      )
  }

];