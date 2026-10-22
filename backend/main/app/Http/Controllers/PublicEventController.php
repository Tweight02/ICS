<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Support\EventsOrg;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PublicEventController extends Controller
{
    public function index()
    {
        $today = now('Asia/Manila')->toDateString();
        $events = Event::query()
            ->where('date_end', '>=', $today)
            ->orderBy('date_start')
            ->orderBy('time_start')
            ->get();

        return response()->json(['data' => $events->map(fn (Event $event) => $this->eventData($event))->values()]);
    }

    public function show(int $event)
    {
        $today = now('Asia/Manila')->toDateString();
        $event = Event::query()->where('date_end', '>=', $today)->findOrFail($event);

        return response()->json(['data' => $this->eventData($event)]);
    }

    public function register(Request $request, int $event)
    {
        $today = now('Asia/Manila')->toDateString();
        $event = Event::query()->where('date_end', '>=', $today)->findOrFail($event);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'extension_name' => ['nullable', 'string', 'max:20'],
            'age' => ['required', 'integer', 'min:1', 'max:120'],
            'gender' => ['required', 'string', Rule::in(['male', 'female', 'other'])],
        ]);
        $data['event_id'] = $event->event_id;
        $data['church_id'] = $event->church_id;
        $data['middle_name'] ??= '';
        $data['registration_status'] = 'pending';

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

    private function eventData(Event $event): array
    {
        $church = EventsOrg::church((int) $event->church_id);
        $districts = $event->districts()->get(['churches.name']);
        $scopeNames = $districts->pluck('name')->all();
        if ($scopeNames === [] && $church) {
            $scopeNames[] = $church->name;
        }

        return [
            'id' => (int) $event->event_id,
            'title' => $event->title,
            'location' => $event->location,
            'start_date' => $event->start_date?->toDateString(),
            'end_date' => $event->end_date?->toDateString(),
            'start_time' => substr($event->start_time, 0, 5),
            'end_time' => substr($event->end_time, 0, 5),
            'description' => $event->notes,
            'church_name' => $church->name ?? null,
            'scope' => $scopeNames,
        ];
    }
}
