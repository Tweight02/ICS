import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { EventsHomeComponent } from '../../../shared/events/events-home.component';
import { EventOverviewComponent } from '../../../shared/events/event-overview.component';
import { EventParticipantsComponent } from '../../../shared/events/event-participants.component';
import { EventFormComponent } from '../../../shared/events/event-form.component';
import {
  EventFormConfig,
  EventOverviewConfig,
  EventsHomeConfig,
  ParticipantsConfig,
} from '../../../shared/events/events.config';

const BASE = '/representative/events';

const HOME: EventsHomeConfig = {
  crumb: 'Events',
  title: 'Events',
  subtitle: 'Welcome back. Keep your church gatherings organized.',
  canCreate: true,
  bannerTitle: 'Plan with purpose. Serve together.',
  bannerSubtitle: '{name}',
  workspaceTitle: 'Your church',
  workspaceText: 'Create and manage events for your assigned church.',
  workspaceChip: 'Church Representative',
  workspaceFromUser: true,
};

const OVERVIEW: EventOverviewConfig = {
  basePath: BASE,
  crumbRoot: 'My Events',
  eyebrow: 'MY EVENTS / EVENT DETAILS',
  subtitle: 'Review your event, selected programs, and participant information.',
  backLabel: 'Back to my events',
  canManage: true,
  organizerFallback: 'Church Representative',
};

const PARTICIPANTS: ParticipantsConfig = {
  basePath: BASE,
  crumbRoot: 'My Events',
  eyebrow: 'MY EVENTS / EVENT DETAILS / PARTICIPANTS',
};

const FORM: EventFormConfig = {
  basePath: BASE,
  crumbRoot: 'My Events',
  coverage: 'church',
  subtitleCreate: 'Add the details for your church event. Your program selections are saved.',
};

@Component({
  selector: 'app-rep-home',
  standalone: true,
  imports: [EventsHomeComponent],
  template: `<app-events-home [config]="config"></app-events-home>`,
})
export class HomeComponent {
  config = HOME;
}

@Component({
  selector: 'app-rep-form',
  standalone: true,
  imports: [EventFormComponent],
  template: `<app-event-form [config]="config"></app-event-form>`,
})
export class CreateEventComponent {
  config = FORM;
}

@Component({
  selector: 'app-rep-overview',
  standalone: true,
  imports: [EventOverviewComponent],
  template: `<app-event-overview [config]="config"></app-event-overview>`,
})
export class EventOverviewPageComponent {
  config = OVERVIEW;
}

@Component({
  selector: 'app-rep-participants',
  standalone: true,
  imports: [EventParticipantsComponent],
  template: `<app-event-participants [config]="config"></app-event-participants>`,
})
export class ParticipantsPageComponent {
  config = PARTICIPANTS;
}

export const EVENTS_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'new', component: CreateEventComponent },
  { path: ':id', component: EventOverviewPageComponent },
  { path: ':id/edit', component: CreateEventComponent },
  { path: ':id/participants', component: ParticipantsPageComponent },
];
