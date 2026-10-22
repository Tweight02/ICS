import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

type RegistrationEvent = {
  id: string;
  title: string;
  banner: string;
  church: string;
  date: string;
  time: string;
  end: string;
  venue: string;
  description: string;
};

type RegistrationFormData = {
  first_name: string;
  last_name: string;
  middle_name: string;
  extension_name: string;
  age: string;
  gender: string;
};

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration implements OnInit {
  events: Record<string, RegistrationEvent> = {
    'leadership-communication-2026': {
      id: 'leadership-communication-2026',
      title: 'Deaconry Quarterly Meeting',
      banner: 'from-green-700 to-green-900',
      church: 'Your Church Name',
      date: 'October 22, 2026',
      time: '8:00 AM',
      end: '11:30 AM',
      venue: 'Central Church',
      description: 'A quarterly gathering for deacons to discuss church ministries, strengthen leadership, and coordinate plans for church activities.',
    },
    'digital-skills-2026': {
      id: 'digital-skills-2026',
      title: 'Youth Delegation Assembly',
      banner: 'from-emerald-600 to-green-800',
      church: 'Your Church Name',
      date: 'October 18, 2026',
      time: '9:00 AM',
      end: '3:00 PM',
      venue: 'North District Chapel',
      description: 'An assembly for youth delegates to build fellowship, share ideas, and participate in meaningful discussions and activities.',
    },
    'community-outreach-2026': {
      id: 'community-outreach-2026',
      title: 'Pastoral Leadership Seminar',
      banner: 'from-teal-600 to-emerald-800',
      church: 'Your Church Name',
      date: 'October 15, 2026',
      time: '8:30 AM',
      end: '12:00 PM',
      venue: 'Central Church',
      description: 'A seminar designed to strengthen pastoral leadership, develop ministry skills, and encourage effective church service.',
    },
  };

  eventId: string | null = null;
  selectedEvent: RegistrationEvent | null = null;
  confirmModalVisible = false;
  successModalVisible = false;
  saving = false;
  errorVisible = false;
  savedRef = '';
  savedTime = '';
  fullName = 'Participant';

  formData: RegistrationFormData = {
    first_name: '',
    last_name: '',
    middle_name: '',
    extension_name: '',
    age: '',
    gender: '',
  };

  ngOnInit(): void {
    this.selectedEvent = this.resolveSelectedEvent();
  }

  resolveSelectedEvent(search: string = window.location.search): RegistrationEvent | null {
    const params = new URLSearchParams(search);
    this.eventId = params.get('event') ?? params.get('eventId') ?? params.get('id');
    return this.eventId ? this.events[this.eventId] ?? null : null;
  }

  get eventTitle(): string {
    return this.selectedEvent?.title ?? 'this event';
  }

  get eventTimeLabel(): string {
    if (!this.selectedEvent) {
      return 'Time not available';
    }

    return `${this.selectedEvent.time}${this.selectedEvent.end ? ` – ${this.selectedEvent.end}` : ''}`;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    this.confirmModalVisible = true;
  }

  cancelSubmit(): void {
    this.confirmModalVisible = false;
  }

  async confirmSubmit(): Promise<void> {
    this.saving = true;

    try {
      const record = await this.saveRegistration();
      const fullName = [
        this.formData.first_name,
        this.formData.middle_name,
        this.formData.last_name,
        this.formData.extension_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      this.fullName = fullName || 'Participant';
      this.savedRef = record.id;
      this.savedTime = new Date(record.savedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });

      this.confirmModalVisible = false;
      this.successModalVisible = true;
    } catch {
      this.errorVisible = true;
      window.setTimeout(() => {
        this.errorVisible = false;
      }, 4000);
    } finally {
      this.saving = false;
    }
  }

  resetForm(form: NgForm): void {
    form.reset();
    this.formData = {
      first_name: '',
      last_name: '',
      middle_name: '',
      extension_name: '',
      age: '',
      gender: '',
    };
    this.successModalVisible = false;
  }

  private async saveRegistration(): Promise<{ id: string; savedAt: string }> {
    await new Promise((resolve) => window.setTimeout(resolve, 600));

    const all = JSON.parse(localStorage.getItem('registrations') || '[]');
    const record = {
      id: 'REG-' + Date.now().toString(36).toUpperCase(),
      event: this.eventId,
      ...this.formData,
      savedAt: new Date().toISOString(),
    };

    all.push(record);
    localStorage.setItem('registrations', JSON.stringify(all));

    return record;
  }
}
