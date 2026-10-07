import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./features/representative/home/home').then(m => m.Home)
    },
    {
        path: 'assistant',
        loadChildren: () => import('./features/assistant/assistant.routes').then(m => m.AssistantRoute)
    },
    {
        path: 'pastor',
        loadChildren: () => import('./features/pastor/pastor.routes').then(m => m.PASTOR_ROUTES)
    },

    {
        path: '',
        redirectTo: 'pastor/reports',
        pathMatch: 'full'
    },

    {
        path: '**',
        redirectTo: 'pastor/reports'
    }
];
