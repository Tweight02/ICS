import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EventService } from '../../../core/services/events/events-api';

type RegistrationEvent = {
  id: number;
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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration implements OnInit {
  eventId: number | null = null;
  private readonly selectedEventState = signal<RegistrationEvent | null>(null);
  get selectedEvent(): RegistrationEvent | null { return this.selectedEventState(); }
  set selectedEvent(value: RegistrationEvent | null) { this.selectedEventState.set(value); }

  private readonly loadingEventState = signal(true);
  get loadingEvent(): boolean { return this.loadingEventState(); }
  set loadingEvent(value: boolean) { this.loadingEventState.set(value); }

  private readonly eventErrorState = signal('');
  get eventError(): string { return this.eventErrorState(); }
  set eventError(value: string) { this.eventErrorState.set(value); }

  private readonly confirmModalVisibleState = signal(false);
  get confirmModalVisible(): boolean { return this.confirmModalVisibleState(); }
  set confirmModalVisible(value: boolean) { this.confirmModalVisibleState.set(value); }

  private readonly successModalVisibleState = signal(false);
  get successModalVisible(): boolean { return this.successModalVisibleState(); }
  set successModalVisible(value: boolean) { this.successModalVisibleState.set(value); }

  private readonly savingState = signal(false);
  get saving(): boolean { return this.savingState(); }
  set saving(value: boolean) { this.savingState.set(value); }

  private readonly errorVisibleState = signal(false);
  get errorVisible(): boolean { return this.errorVisibleState(); }
  set errorVisible(value: boolean) { this.errorVisibleState.set(value); }

  private readonly errorMessageState = signal('Could not save your registration. Please try again.');
  get errorMessage(): string { return this.errorMessageState(); }
  set errorMessage(value: string) { this.errorMessageState.set(value); }

  private readonly savedRefState = signal('');
  get savedRef(): string { return this.savedRefState(); }
  set savedRef(value: string) { this.savedRefState.set(value); }

  private readonly savedTimeState = signal('');
  get savedTime(): string { return this.savedTimeState(); }
  set savedTime(value: string) { this.savedTimeState.set(value); }

  private readonly fullNameState = signal('Participant');
  get fullName(): string { return this.fullNameState(); }
  set fullName(value: string) { this.fullNameState.set(value); }

  formData: RegistrationFormData = {
    first_name: '',
    last_name: '',
    middle_name: '',
    extension_name: '',
    age: '',
    gender: '',
  };

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.queryParamMap.get('event')
      ?? this.route.snapshot.queryParamMap.get('eventId')
      ?? this.route.snapshot.queryParamMap.get('id');
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
      this.loadingEvent = false;
      this.eventError = 'Choose an upcoming event before registering.';
      return;
    }

    this.eventId = id;
    this.eventService.getPublicEventById(id).subscribe({
      next: (event) => {
        this.selectedEvent = {
          id: event.id,
          title: event.title,
          banner: 'from-green-700 to-green-900',
          church: (event.scope ?? []).join(', ') || event.church_name || 'Not specified',
          date: this.formatDate(event.start_date, event.end_date),
          time: event.start_time,
          end: event.end_time,
          venue: event.location,
          description: event.description || 'Register to participate in this event.',
        };
        this.loadingEvent = false;
      },
      error: (error) => {
        console.error('Failed to load event for registration', error);
        this.eventError = error?.status === 404
          ? 'This event is no longer open for registration.'
          : 'Could not load this event. Please return to the events page and try again.';
        this.loadingEvent = false;
      },
    });
  }

  private formatDate(start: string, end: string): string {
    const startDate = new Date(`${start}T00:00:00`);
    const startLabel = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(startDate);
    if (start === end) return startLabel;
    const endDate = new Date(`${end}T00:00:00`);
    return `${startLabel} – ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(endDate)}`;
  }

  get eventTitle(): string {
    return this.selectedEvent?.title ?? 'this event';
  }

  get eventTimeLabel(): string {
    if (!this.selectedEvent) return 'Time not available';
    return `${this.selectedEvent.time}${this.selectedEvent.end ? ` – ${this.selectedEvent.end}` : ''}`;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || !this.selectedEvent) {
      form.form.markAllAsTouched();
      return;
    }

    this.confirmModalVisible = true;
  }

  cancelSubmit(): void {
    this.confirmModalVisible = false;
  }

  async confirmSubmit(): Promise<void> {
    if (!this.eventId) return;
    this.saving = true;
    this.errorVisible = false;

    try {
      const record = await firstValueFrom(this.eventService.registerPublicParticipant(this.eventId, {
        ...this.formData,
        age: Number(this.formData.age),
      }));
      const fullName = [
        this.formData.first_name,
        this.formData.middle_name,
        this.formData.last_name,
        this.formData.extension_name,
      ].filter(Boolean).join(' ').trim();

      this.fullName = fullName || 'Participant';
      this.savedRef = record.reference ?? `REG-${record.id}`;
      this.savedTime = new Date(record.saved_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      this.confirmModalVisible = false;
      this.successModalVisible = true;
    } catch (error: any) {
      console.error('Failed to save participant registration', error);
      this.errorMessage = error?.status === 422 && error?.error?.errors
        ? Object.values(error.error.errors).flat().join(' ')
        : 'Could not save your registration. Please try again.';
      this.errorVisible = true;
      this.confirmModalVisible = false;
    } finally {
      this.saving = false;
    }
  }

  resetForm(form: NgForm): void {
    form.resetForm();
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
}
