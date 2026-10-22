<?php

namespace App\Modules\Events\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Events\Http\Resources\ParticipantResource;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\EventParticipant;
use App\Modules\Events\Support\EventUser;
use Illuminate\Http\Request;

class ParticipantController extends Controller
{
    private function visibleEvent(Request $request, int $id): Event
    {
        return Event::visibleTo(EventUser::fromRequest($request))->findOrFail($id);
    }

    /** Only the creator of the event can change its participants. */
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
            $query->where(fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('role', 'like', "%$search%"));
        }
        if (in_array($request->query('status'), ['confirmed', 'pending'], true)) {
            $query->where('status', $request->query('status'));
        }

        $total = $event->participants()->count();
        $confirmed = $event->participants()->where('status', 'confirmed')->count();

        return ParticipantResource::collection($query->orderBy('name')->paginate(10))
            ->additional(['summary' => ['total' => $total, 'confirmed' => $confirmed, 'pending' => $total - $confirmed]]);
    }

    public function store(Request $request, int $event)
    {
        $event = $this->editableEvent($request, $event);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'role' => ['required', 'string', 'max:80'],
            'status' => ['nullable', 'in:confirmed,pending'],
        ]);

        return (new ParticipantResource($event->participants()->create($data + ['status' => 'pending'])))
            ->response()->setStatusCode(201);
    }

    public function update(Request $request, int $participant)
    {
        $participant = EventParticipant::findOrFail($participant);
        $this->editableEvent($request, $participant->event_id);
        $participant->update($request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'role' => ['sometimes', 'string', 'max:80'],
            'status' => ['sometimes', 'in:confirmed,pending'],
        ]));

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
