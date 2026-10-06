import { Routes } from '@angular/router';

export const PastorRoute: Routes = [
    {
        path:'stewardship',
        loadComponent: () =>import('./stewardship/stewardship').then(m=>m.Stewardship)
    }
];