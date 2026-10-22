import { Routes } from '@angular/router';

export const PARTICIPANT_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () =>
			import('./home/home').then((module) => module.Home),
	},
	{
		path: 'registration',
		loadComponent: () =>
			import('./registration/registration').then((module) => module.Registration),
	},
];
