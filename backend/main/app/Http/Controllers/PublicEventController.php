<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Support\EventRegistrationAttribution;
use App\Support\EventsOrg;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PublicEventController extends Controller
{
    public function index()
    {
        $today = now('Asia/Manila')->toDateString();
        $events = Event::query()
            ->orderByRaw('CASE WHEN date_end >= ? THEN 0 ELSE 1 END', [$today])
            ->orderBy('date_start')
            ->orderBy('time_start')
            ->get();

        return response()->json([
            'data' => $events->map(fn (Event $event) => $this->eventData($event))->values(),
        ]);
    }

    public function show(Request $request, int $event)
    {
        $today = now('Asia/Manila')->toDateString();
        $event = Event::query()->where('date_end', '>=', $today)->findOrFail($event);

        $data = $this->eventData($event);
        $churchId = $this->registrationChurchId($request, $event);
        if ($churchId !== null) {
            $data['registration_church_name'] = EventsOrg::church($churchId)?->name;
        }

        return response()->json(['data' => $data]);
    }

    public function register(Request $request, int $event)
    {
        $today = now('Asia/Manila')->toDateString();
        $event = Event::query()->where('date_end', '>=', $today)->findOrFail($event);
        $churchId = $this->registrationChurchId($request, $event);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'extension_name' => ['nullable', 'string', 'max:20'],
            'age' => ['required', 'integer', 'min:1', 'max:120'],
            'gender' => ['required', 'string', Rule::in(['male', 'female', 'other'])],
        ]);
        $data['event_id'] = $event->event_id;
        $data['church_id'] = $churchId ?? $event->church_id;
        $data['middle_name'] ??= '';
        $data['extension_name'] ??= '';
        $data['registration_status'] = 'pending';

        $duplicateExists = $event->participants()
            ->where('church_id', $data['church_id'])
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower(trim($data['first_name']))])
            ->whereRaw('LOWER(TRIM(COALESCE(middle_name, ?))) = ?', [
                '',
                mb_strtolower(trim($data['middle_name'])),
            ])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower(trim($data['last_name']))])
            ->whereRaw('LOWER(TRIM(COALESCE(extension_name, ?))) = ?', [
                '',
                mb_strtolower(trim($data['extension_name'])),
            ])
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'first_name' => ['This participant is already registered for this event.'],
            ]);
        }

        $participant = DB::transaction(fn () => $event->participants()->create($data));

        return response()->json([
            'data' => [
                'id' => $participant->participant_id,
                'reference' => 'REG-'.$participant->participant_id,
                'saved_at' => now('Asia/Manila')->toIso8601String(),
                'status' => $participant->status,
            ],
        ], 201);
    }

    private function registrationChurchId(Request $request, Event $event): ?int
    {
        $churchId = $request->query('church_id');
        $token = $request->query('registration_token');
        if ($churchId === null && $token === null) {
            return null;
        }

        abort_unless(
            filter_var($churchId, FILTER_VALIDATE_INT) !== false
            && is_string($token)
            && hash_equals(
                EventRegistrationAttribution::token((int) $event->event_id, (int) $churchId),
                $token
            ),
            422,
            'This church-specific registration link is invalid.'
        );

        abort_unless($event->coversChurch((int) $churchId), 422, 'This event is not scheduled for this church.');
        EventRegistrationAttribution::quarterId((int) $event->quarter_id, (int) $churchId);

        return (int) $churchId;
    }

    private function eventData(Event $event): array
    {
        $church = EventsOrg::church((int) $event->church_id);
        $hostChurch = EventsOrg::church((int) $event->host_church_id);
        $districts = $event->districts()->get(['churches.name']);
        $churches = $event->churches()->get(['churches.name']);
        $scopeNames = $districts->pluck('name')->all();
        $allDistrictsSelected = $districts->isNotEmpty()
            && $districts->count() === EventsOrg::districts()->count();
        if ($scopeNames === []) {
            $scopeNames = $churches->pluck('name')->all();
        }
        if ($scopeNames === [] && $church) {
            $scopeNames[] = $church->name;
        }
        $creator = $event->createdBy()->first([
            'users.first_name',
            'users.last_name',
            'users.role',
        ]);

        return [
            'id' => (int) $event->event_id,
            'title' => $event->title,
            'location' => $event->location,
            'start_date' => $event->start_date?->toDateString(),
            'end_date' => $event->end_date?->toDateString(),
            'start_time' => substr($event->start_time, 0, 5),
            'end_time' => substr($event->end_time, 0, 5),
            'description' => $event->notes,
            'church_name' => $churches->count() > 1
                ? 'Multiple churches'
                : ($churches->first()->name ?? $church->name ?? null),
            'host_church_id' => $event->host_church_id ? (int) $event->host_church_id : null,
            'host_church_name' => $hostChurch?->name,
            'host' => $hostChurch?->name,
            'scope' => $scopeNames,
            'all_districts' => $allDistrictsSelected,
            'created_by' => match ($creator?->role) {
                'assistant' => 'Department Assistant',
                'administrative_assistant' => 'Administrative Assistant',
                'district_pastor' => 'District Pastor',
                'church_representative' => 'Church Representative',
                'director' => 'Director',
                default => null,
            },
            'registration_open' => ($event->end_date?->toDateString() ?? '') >= now('Asia/Manila')->toDateString(),
        ];
    }
}
