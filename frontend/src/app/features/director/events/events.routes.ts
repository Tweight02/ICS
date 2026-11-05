import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { EventsHomeComponent } from '../../../shared/events/events-home.component';
import { EventOverviewComponent } from '../../../shared/events/event-overview.component';
import { EventParticipantsComponent } from '../../../shared/events/event-participants.component';
import {
  EventOverviewConfig,
  EventsHomeConfig,
  ParticipantsConfig,
} from '../../../shared/events/events.config';

// The Director only reads events: no Create, Edit or Delete, and no department selection.
const BASE = '/director/events';

const HOME: EventsHomeConfig = {
  crumb: 'All Events',
  title: 'All Events',
  subtitle: 'View upcoming events across The East Luzon Mission.',
  canCreate: false,
  badge: 'Read-only workspace',
  bannerTitle: 'A clear view of every gathering.',
  bannerSubtitle: 'Mission-wide',
  workspaceTitle: 'Mission-wide',
  workspaceText: 'Browse event details and selected programs across the mission. Event records are read-only.',
  workspaceChip: 'Read-only access',
};

const OVERVIEW: EventOverviewConfig = {
  basePath: BASE,
  crumbRoot: 'All Events',
  eyebrow: 'ALL EVENTS / EVENT DETAILS',
  subtitle: 'View event information, programs, and participant context.',
  backLabel: 'Back to all events',
  canManage: false,
  badge: 'Read-only',
  readOnlyNote: 'Director access is read-only. Event details and program selections cannot be changed.',
  organizerFallback: 'Church Representative',
};

const PARTICIPANTS: ParticipantsConfig = {
  basePath: BASE,
  crumbRoot: 'All Events',
  eyebrow: 'ALL EVENTS / EVENT DETAILS / PARTICIPANTS',
  churchFilter: true,
};

@Component({
  selector: 'app-director-events',
  standalone: true,
  imports: [EventsHomeComponent],
  template: `<app-events-home [config]="config"></app-events-home>`,
})
export class DirectorEventsComponent {
  config = HOME;
}

@Component({
  selector: 'app-director-event-detail',
  standalone: true,
  imports: [EventOverviewComponent],
  template: `<app-event-overview [config]="config"></app-event-overview>`,
})
export class DirectorEventDetailComponent {
  config = OVERVIEW;
}

@Component({
  selector: 'app-director-participants',
  standalone: true,
  imports: [EventParticipantsComponent],
  template: `<app-event-participants [config]="config"></app-event-participants>`,
})
export class DirectorParticipantsComponent {
  config = PARTICIPANTS;
}

export const DIRECTOR_EVENTS_ROUTES: Routes = [
  { path: '', component: DirectorEventsComponent },
  { path: ':id', component: DirectorEventDetailComponent },
  { path: ':id/participants', component: DirectorParticipantsComponent },
];
