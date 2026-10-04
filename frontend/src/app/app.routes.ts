import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>import('./features/representative/home/home').then(m=>m.Home)
    }
];
