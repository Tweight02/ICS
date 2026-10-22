import { Routes } from '@angular/router';
import { EVENTS1_ROUTES } from './events/events.routes';

export const AssistantRoute: Routes = [
    {
        path: 'new-user',
        loadComponent: () => import('./user_management/new-user/new-user').then(m => m.NewUser)
    },
    {
        path: 'view-user',
        loadComponent: () => import('./user_management/view-user/view-user').then(m => m.ViewUser)
    },
    {
        path: 'edit-user/:id',
        loadComponent: () => import('./user_management/edit-user/edit-user').then(m => m.EditUser)
    },
    {
        path: 'assign-user',
        loadComponent: () => import('./user_management/assign-user/assign-user').then(m => m.AssignUser)
    },
    {
        path: 'reports',
        loadComponent: () =>
            import('./report_a/reports/reports')
                .then(m => m.Reports)
    },
    {
        path: 'reports/new',
        loadComponent: () =>
            import('./report_a/new-report/new-report')
                .then(m => m.NewReport)
    },
    {
        path: 'reports/details/:id',
        loadComponent: () =>
            import('./report_a/reports-details/reports-details')
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
     // ==============================
      // EVENTS (Adicionados aqui diretamente)
      // ==============================
     {
        path: 'events',
        children: EVENTS1_ROUTES
      }




];
