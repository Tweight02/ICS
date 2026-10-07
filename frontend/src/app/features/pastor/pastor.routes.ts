import { Routes } from '@angular/router';

export const PastorRoute: Routes = [
    {
        path:'stewardship',
        loadComponent: () =>import('./stewardship/stewardship').then(m=>m.Stewardship)
    },


     {
    path: 'baptism',
    loadComponent: () =>
      import('./baptism/baptism.component')
        .then(m => m.BaptismComponent)
  }

];