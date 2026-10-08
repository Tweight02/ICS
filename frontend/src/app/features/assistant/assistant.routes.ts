import { Routes } from '@angular/router';

export const AssistantRoute: Routes = [
    {
        path: 'new-user',
        loadComponent: () => import('./new-user/new-user').then(m => m.NewUser)
    },
    {
        path: 'view-user',
        loadComponent: () => import('./view-user/view-user').then(m => m.ViewUser)
    },
    {
        path: 'edit-user/:id',
        loadComponent: () => import('./edit-user/edit-user').then(m => m.EditUser)
    },
    {
        path: 'reports',
        loadComponent: () => import('../pastor/report_p/reports/reports').then(m => m.Reports)
    }
];