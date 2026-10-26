import { Routes } from '@angular/router';
import { EVENTS_ROUTES } from './events/events.routes';


export const RepresentativeRoute: Routes = [
  {
    path: 'profile',
    redirectTo: '/profile',
    pathMatch: 'full'
  },

  // Default route
  {
    path: '',
    redirectTo: '',
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
  },
    {
    path: 'stewardship',
    loadComponent: () =>
      import('../representative/stewardship/stewardship')
        .then(m => m.Stewardship)
  },

  // ==============================
  // EVENTS (Adicionados aqui diretamente)
  // ==============================
 {
    path: 'events',
    children: EVENTS_ROUTES
  }



];
