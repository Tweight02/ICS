import { Routes } from '@angular/router';

export const routes: Routes = [

  /* ==============================
     HOME
  ============================== */

  {
    path: '',
    loadComponent: () =>
      import('./features/representative/home/home')
        .then(m => m.Home),
    pathMatch: 'full'
  },


  /* ==============================
     ASSISTANT
  ============================== */

  {
    path: 'assistant',
    loadChildren: () =>
      import('./features/assistant/assistant.routes')
        .then(m => m.AssistantRoute)
  },


  /* ==============================
     DIRECTOR
  ============================== */

  {
    path: 'director',
    loadChildren: () =>
      import('./features/director/director.routes')
        .then(m => m.DIRECTOR_ROUTES)
  },


  /* ==============================
     PASTOR
  ============================== */

  {
    path: 'pastor',
    loadChildren: () =>
      import('./features/pastor/pastor.routes')
        .then(m => m.PASTOR_ROUTES)
  },


  /* ==============================
     UNKNOWN ROUTE
  ============================== */

  {
    path: '**',
    redirectTo: 'pastor/reports'
  }

];