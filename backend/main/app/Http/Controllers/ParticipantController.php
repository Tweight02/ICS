<?php

namespace App\Http\Controllers;

use App\Http\Resources\ParticipantResource;
use App\Models\Event;
use App\Models\EventParticipant;
use App\Support\EventUser;
use Illuminate\Http\Request;

class ParticipantController extends Controller
{
    private function visibleEvent(Request $request, int $id): Event
    {
        return Event::visibleTo(EventUser::fromRequest($request))->findOrFail($id);
    }

    private function editableEvent(Request $request, int $id): Event
    {
        $event = $this->visibleEvent($request, $id);
        abort_unless(Event::canChange(EventUser::fromRequest($request), $event), 403);

        return $event;
    }

    public function index(Request $request, int $event)
    {
        $event = $this->visibleEvent($request, $event);
        $request->validate(['status' => ['nullable', 'in:confirmed,pending,all']]);

        $query = $event->participants();
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('first_name', 'like', "%$search%")
                ->orWhere('middle_name', 'like', "%$search%")
                ->orWhere('last_name', 'like', "%$search%"));
        }
        if (in_array($request->query('status'), ['confirmed', 'pending'], true)) {
            $query->whereRaw('LOWER(registration_status) = ?', [$request->query('status')]);
        }

        $total = $event->participants()->count();
        $confirmed = $event->participants()->whereRaw('LOWER(registration_status) = ?', ['confirmed'])->count();

        return ParticipantResource::collection($query->orderBy('last_name')->orderBy('first_name')->paginate(10))
            ->additional([
                'summary' => [
                    'total' => $total,
                    'confirmed' => $confirmed,
                    'pending' => $total - $confirmed,
                ],
            ]);
    }

    public function store(Request $request, int $event)
    {
        $event = $this->editableEvent($request, $event);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'extension_name' => ['nullable', 'string', 'max:20'],
            'age' => ['required', 'integer', 'min:0', 'max:150'],
            'gender' => ['required', 'string', 'max:20'],
            'registration_status' => ['nullable', 'string', 'max:30'],
        ]);
        $data['middle_name'] ??= '';
        $data['church_id'] = $event->church_id;
        $data['registration_status'] ??= 'pending';

        $participant = $event->participants()->create($data);

        return (new ParticipantResource($participant))
            ->response()->setStatusCode(201);
    }

    public function update(Request $request, int $participant)
    {
        $participant = EventParticipant::findOrFail($participant);
        $event = $this->editableEvent($request, $participant->event_id);
        $data = $request->validate([
            'registration_status' => ['sometimes', 'string', 'max:30'],
            'status' => ['sometimes', 'in:confirmed,pending'],
        ]);
        if (isset($data['status'])) {
            $data['registration_status'] = $data['status'];
            unset($data['status']);
        }
        abort_unless((int) $participant->church_id === (int) $event->church_id, 422);
        $participant->update($data);

        return new ParticipantResource($participant);
    }

    public function destroy(Request $request, int $participant)
    {
        $participant = EventParticipant::findOrFail($participant);
        $this->editableEvent($request, $participant->event_id);
        $participant->delete();

        return response()->noContent();
    }
}
