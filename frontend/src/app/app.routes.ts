import { Routes } from '@angular/router';

export const routes: Routes = [

  /* ==============================
     HOME
  ============================== */
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login')
        .then(m => m.Login)
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
     REPRESENTATIVE
  ============================== */

    {
    path: 'representative',
    loadChildren: () =>
      import('./features/representative/representative.routes')
        .then(m => m.RepresentativeRoute)
  },

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }



];
