import { Routes } from '@angular/router';

export const AssistantRoute: Routes = [
    {
        path: 'new-user',
        loadComponent: () => import('./new-user/new-user').then(m => m.NewUser)
    },
];