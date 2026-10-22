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

const BASE = '/assistant/events';

const HOME: EventsHomeConfig = {
  crumb: 'Events',
  title: 'Events',
  subtitle: 'Coordinate upcoming gatherings across the mission’s districts.',
  canCreate: true,
  bannerTitle: 'Plan with purpose. Serve together.',
  bannerSubtitle: 'Mission-wide',
  workspaceTitle: 'Mission-wide',
  workspaceText: 'Coordinate mission events across one, several, or all districts.',
  workspaceChip: 'Assistant',
};

const OVERVIEW: EventOverviewConfig = {
  basePath: BASE,
  crumbRoot: 'My Events',
  eyebrow: 'MY EVENTS / EVENT DETAILS',
  subtitle: 'Review your event, selected programs, districts, and participant information.',
  backLabel: 'Back to my events',
  canManage: true,
  organizerFallback: 'Mission Assistant',
};

const PARTICIPANTS: ParticipantsConfig = {
  basePath: BASE,
  crumbRoot: 'My Events',
  eyebrow: 'MY EVENTS / EVENT DETAILS / PARTICIPANTS',
};

const FORM: EventFormConfig = {
  basePath: BASE,
  crumbRoot: 'My Events',
  coverage: 'districts',
  subtitleCreate: 'Create a mission event and choose exactly which districts are included.',
};

@Component({
  selector: 'app-assistant-home',
  standalone: true,
  imports: [EventsHomeComponent],
  template: `<app-events-home [config]="config"></app-events-home>`,
})
export class HomeComponent {
  config = HOME;
}

@Component({
  selector: 'app-assistant-form',
  standalone: true,
  imports: [EventFormComponent],
  template: `<app-event-form [config]="config"></app-event-form>`,
})
export class CreateEventComponent {
  config = FORM;
}

@Component({
  selector: 'app-assistant-overview',
  standalone: true,
  imports: [EventOverviewComponent],
  template: `<app-event-overview [config]="config"></app-event-overview>`,
})
export class EventOverviewPageComponent {
  config = OVERVIEW;
}

@Component({
  selector: 'app-assistant-participants',
  standalone: true,
  imports: [EventParticipantsComponent],
  template: `<app-event-participants [config]="config"></app-event-participants>`,
})
export class ParticipantsPageComponent {
  config = PARTICIPANTS;
}

export const EVENTS1_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'new', component: CreateEventComponent },
  { path: ':id', component: EventOverviewPageComponent },
  { path: ':id/edit', component: CreateEventComponent },
  { path: ':id/participants', component: ParticipantsPageComponent },
];
