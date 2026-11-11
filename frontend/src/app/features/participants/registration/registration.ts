import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EventService } from '../../../core/services/events/events-api';
import { Button } from '../../../shared/components/button/button';
import { formatDateRange, formatTime } from '../../../shared/events/event.utils';
import { showAppAlert } from '../../../shared/utils/app-alert';

type RegistrationEvent = {
  id: number;
  title: string;
  church: string;
  createdBy: string;
  host: string;
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

type RegistrationAttribution = {
  church_id: number;
  registration_token: string;
};

function isRegistrationAttribution(value: unknown): value is RegistrationAttribution {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const attribution = value as Record<string, unknown>;
  return Number.isInteger(attribution['church_id'])
    && typeof attribution['registration_token'] === 'string';
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, Button],
  templateUrl: './registration.html',
})
export class Registration implements OnInit, OnDestroy {
  eventId: number | null = null;
  private registrationAttribution: RegistrationAttribution | undefined;
  private successNotificationTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly selectedEventState = signal<RegistrationEvent | null>(null);
  get selectedEvent(): RegistrationEvent | null { return this.selectedEventState(); }
  set selectedEvent(value: RegistrationEvent | null) { this.selectedEventState.set(value); }

  private readonly loadingEventState = signal(true);
  get loadingEvent(): boolean { return this.loadingEventState(); }
  set loadingEvent(value: boolean) { this.loadingEventState.set(value); }

  private readonly eventErrorState = signal('');
  get eventError(): string { return this.eventErrorState(); }
  set eventError(value: string) { this.eventErrorState.set(value); }

  private readonly successModalVisibleState = signal(false);
  get successModalVisible(): boolean { return this.successModalVisibleState(); }
  set successModalVisible(value: boolean) { this.successModalVisibleState.set(value); }

  private readonly savingState = signal(false);
  get saving(): boolean { return this.savingState(); }
  set saving(value: boolean) { this.savingState.set(value); }

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
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.queryParamMap.get('event')
      ?? this.route.snapshot.queryParamMap.get('eventId')
      ?? this.route.snapshot.queryParamMap.get('id');
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
      this.loadingEvent = false;
      this.eventError = 'Choose an upcoming event before registering.';
      this.showErrorAlert(this.eventError);
      return;
    }

    this.eventId = id;
    const churchId = Number(this.route.snapshot.queryParamMap.get('church_id'));
    const attributionParams = new URLSearchParams(this.route.snapshot.fragment ?? '');
    const fragmentChurchId = Number(attributionParams.get('church_id'));
    const fragmentRegistrationToken = attributionParams.get('registration_token');
    const queryRegistrationToken = this.route.snapshot.queryParamMap.get('registration_token');
    const registrationToken = queryRegistrationToken
      ?? fragmentRegistrationToken;
    const attributedChurchId = queryRegistrationToken ? churchId : fragmentChurchId;

    if (Number.isInteger(attributedChurchId) && attributedChurchId > 0 && registrationToken) {
      this.registrationAttribution = {
        church_id: attributedChurchId,
        registration_token: registrationToken,
      };
    } else {
      this.registrationAttribution = this.savedRegistrationAttribution();
    }

    if (registrationToken) {
      this.clearRegistrationTokenFromUrl();
    }

    this.eventService.getPublicEventById(id, this.registrationAttribution).subscribe({
      next: (event) => {
        this.selectedEvent = {
          id: event.id,
          title: event.title,
          church: event.all_districts
            ? 'All District of NELM'
            : (event.scope ?? []).join(', ')
            || event.church_name
            || 'Not specified',
          createdBy: event.created_by ?? '',
          host: event.host_church_name ?? event.host_church?.name ?? '',
          date: formatDateRange(event.start_date, event.end_date),
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
        this.showErrorAlert(this.eventError);
        this.loadingEvent = false;
      },
    });
  }

  private clearRegistrationTokenFromUrl(): void {
    void this.router.navigateByUrl(
      `/participants/registration?event=${this.eventId}`,
      {
        replaceUrl: true,
        state: { registrationAttribution: this.registrationAttribution },
      }
    );
  }

  private savedRegistrationAttribution(): RegistrationAttribution | undefined {
    const state = this.location.getState();
    if (!state || typeof state !== 'object') {
      return undefined;
    }

    const attribution = (state as Record<string, unknown>)['registrationAttribution'];
    return isRegistrationAttribution(attribution) ? attribution : undefined;
  }

  ngOnDestroy(): void {
    if (this.successNotificationTimeout) {
      clearTimeout(this.successNotificationTimeout);
    }
  }

  get eventTitle(): string {
    return this.selectedEvent?.title ?? 'this event';
  }

  get eventTimeLabel(): string {
    if (!this.selectedEvent) return 'Time not available';
    const start = formatTime(this.selectedEvent.time);
    const end = formatTime(this.selectedEvent.end);
    return start && end ? `${start}–${end}` : start || end;
  }

  async onSubmit(form: NgForm): Promise<void> {
    if (form.invalid || !this.selectedEvent) {
      form.form.markAllAsTouched();
      const message = !this.selectedEvent
        ? 'Please choose an event before submitting the form.'
        : 'Please complete all required fields before submitting.';
      this.showErrorAlert(message);
      return;
    }

    await this.submitRegistration();
  }

  private showErrorAlert(message: string): void {
    void showAppAlert({
      icon: 'error',
      title: 'Registration failed',
      text: message,
      confirmButtonColor: '#166534',
    });
  }

  private showSuccessAlert(fullName: string, eventTitle: string): void {
    void showAppAlert({
      icon: 'success',
      title: 'Registration successful',
      text: `${fullName} has been registered for ${eventTitle}.`,
      confirmButtonColor: '#166534',
    });
  }

  private async submitRegistration(): Promise<void> {
    if (!this.eventId) return;
    this.saving = true;

    try {
      const record = await firstValueFrom(this.eventService.registerPublicParticipant(this.eventId, {
        ...this.formData,
        age: Number(this.formData.age),
      }, this.registrationAttribution));
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
      this.formData = {
        first_name: '',
        last_name: '',
        middle_name: '',
        extension_name: '',
        age: '',
        gender: '',
      };
      this.successModalVisible = false;
      if (this.successNotificationTimeout) {
        clearTimeout(this.successNotificationTimeout);
        this.successNotificationTimeout = null;
      }
      this.showSuccessAlert(this.fullName, this.eventTitle);
    } catch (error: any) {
      console.error('Failed to save participant registration', error);
      this.errorMessage = error?.status === 422 && error?.error?.errors
        ? Object.values(error.error.errors).flat().join(' ')
        : 'Could not save your registration. Please try again.';
      this.showErrorAlert(this.errorMessage);
    } finally {
      this.saving = false;
    }
  }

}
