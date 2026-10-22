import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type EventCard = {
  id: string;
  title: string;
  banner: string;
  date: string;
  time: string;
  end: string;
  venue: string;
  church: string;
  description: string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  events: EventCard[] = [
    {
      id: 'leadership-communication-2026',
      title: 'Deaconry Quarterly Meeting',
      banner: 'from-green-700 to-green-900',
      date: 'October 22, 2026',
      time: '8:00 AM',
      end: '11:30 AM',
      venue: 'Central Church',
      church: 'Your Church Name',
      description: 'A quarterly gathering for deacons to discuss church ministries, strengthen leadership, and coordinate church activities.',
    },
    {
      id: 'digital-skills-2026',
      title: 'Youth Delegation Assembly',
      banner: 'from-emerald-600 to-green-800',
      date: 'October 18, 2026',
      time: '9:00 AM',
      end: '3:00 PM',
      venue: 'North District Chapel',
      church: 'Your Church Name',
      description: 'An assembly for youth delegates to build fellowship, share ideas, and participate in meaningful discussions and activities.',
    },
    {
      id: 'community-outreach-2026',
      title: 'Pastoral Leadership Seminar',
      banner: 'from-teal-600 to-emerald-800',
      date: 'October 15, 2026',
      time: '8:30 AM',
      end: '12:00 PM',
      venue: 'Central Church',
      church: 'Your Church Name',
      description: 'A seminar focused on strengthening pastoral leadership, developing ministry skills, and encouraging effective church service.',
    },
  ];

  registrationUrl(eventId: string): string {
    return `registration.html?event=${eventId}`;
  }
}
