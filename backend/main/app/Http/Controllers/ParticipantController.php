<?php

namespace App\Http\Controllers;

use App\Http\Resources\ParticipantResource;
use App\Models\Event;
use App\Models\EventParticipant;
use App\Support\EventRegistrationAttribution;
use App\Support\EventUser;
use App\Support\ReportParticipantCoverage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    private function confirmableEvent(Request $request, int $id): Event
    {
        $user = EventUser::fromRequest($request);
        abort_unless($user->role === 'church_representative', 403);

        return $this->visibleEvent($request, $id);
    }

    public function index(Request $request, int $event)
    {
        $event = $this->visibleEvent($request, $event);
        $request->validate(['status' => ['nullable', 'in:confirmed,pending,all']]);

        $user = EventUser::fromRequest($request);
        $query = $event->participants();
        if ($user->role === 'church_representative') {
            $query->where('church_id', $user->churchId ?? 0);
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('first_name', 'like', "%$search%")
                ->orWhere('middle_name', 'like', "%$search%")
                ->orWhere('last_name', 'like', "%$search%"));
        }
        if (in_array($request->query('status'), ['confirmed', 'pending'], true)) {
            $query->whereRaw('LOWER(registration_status) = ?', [$request->query('status')]);
        }

        $summaryQuery = $event->participants();
        if ($user->role === 'church_representative') {
            $summaryQuery->where('church_id', $user->churchId ?? 0);
        }
        $total = (clone $summaryQuery)->count();
        $confirmed = (clone $summaryQuery)
            ->whereRaw('LOWER(registration_status) = ?', ['confirmed'])->count();

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
            'registration_status' => ['sometimes', 'in:pending'],
        ]);
        $data['middle_name'] ??= '';
        $data['church_id'] = $event->church_id;
        $data['registration_status'] ??= 'pending';

        $participant = DB::transaction(function () use ($event, $data) {
            return $event->participants()->create($data);
        });

        return (new ParticipantResource($participant))
            ->response()->setStatusCode(201);
    }

    public function update(Request $request, int $participant)
    {
        $participant = EventParticipant::findOrFail($participant);
        $user = EventUser::fromRequest($request);
        $event = $this->confirmableEvent($request, $participant->event_id);
        $data = $request->validate([
            'registration_status' => ['sometimes', 'in:confirmed,pending'],
            'status' => ['sometimes', 'in:confirmed,pending'],
        ]);
        if (isset($data['status'])) {
            $data['registration_status'] = $data['status'];
            unset($data['status']);
        }
        abort_unless((int) $participant->church_id === $user->churchId, 403);

        $participant = DB::transaction(function () use ($participant, $event, $data) {
            $participant = EventParticipant::query()
                ->whereKey($participant->getKey())
                ->lockForUpdate()
                ->firstOrFail();
            $wasConfirmed = $participant->status === 'confirmed';
            $participant->update($data);

            if (! $wasConfirmed && $participant->status === 'confirmed') {
                $quarterId = EventRegistrationAttribution::quarterId(
                    (int) $event->quarter_id,
                    (int) $participant->church_id
                );
                $this->assertQuarterCanReceiveContributions($quarterId);
                $this->recordReportContributions($event, $participant, $quarterId);
            } elseif ($wasConfirmed && $participant->status !== 'confirmed') {
                $contributions = DB::table('event_participant_contributions')
                    ->where('event_id', $event->event_id)
                    ->where('participant_id', $participant->participant_id)
                    ->get(['quarter_id', 'particular_id']);

                DB::table('event_participant_contributions')
                    ->where('event_id', $event->event_id)
                    ->where('participant_id', $participant->participant_id)
                    ->delete();

                $affectedItems = $contributions
                    ->mapWithKeys(fn ($contribution) => [
                        $contribution->quarter_id.':'.$contribution->particular_id => [
                            'quarter_id' => (int) $contribution->quarter_id,
                            'particular_id' => (int) $contribution->particular_id,
                        ],
                    ]);

                foreach (DB::table('event_particular')
                    ->where('event_id', $event->event_id)
                    ->whereIn('particular_id', ReportParticipantCoverage::headcountParticularIds())
                    ->pluck('particular_id') as $particularId) {
                    $affectedItems[$event->quarter_id.':'.$particularId] = [
                        'quarter_id' => (int) $event->quarter_id,
                        'particular_id' => (int) $particularId,
                    ];
                }

                foreach ($affectedItems as $item) {
                    $this->syncParticularItemTotal($item['quarter_id'], $item['particular_id']);
                }
            }

            return $participant;
        });

        return new ParticipantResource($participant);
    }

    public function destroy(Request $request, int $participant)
    {
        $participant = EventParticipant::findOrFail($participant);
        $this->editableEvent($request, $participant->event_id);
        $participant->delete();

        return response()->noContent();
    }

    private function assertQuarterCanReceiveContributions(int $quarterId): void
    {
        $quarter = DB::table('quarters')
            ->where('quarter_id', $quarterId)
            ->lockForUpdate()
            ->first(['mission_approve']);

        abort_if(
            ! $quarter || $quarter->mission_approve !== null,
            422,
            'Participants cannot be confirmed because this reporting quarter is already approved.'
        );
    }

    private function recordReportContributions(Event $event, EventParticipant $participant, int $quarterId): void
    {
        $now = now();
        $headcountParticularIds = ReportParticipantCoverage::headcountParticularIds();
        $existingParticularIds = DB::table('event_participant_contributions')
            ->where('event_id', $event->event_id)
            ->where('participant_id', $participant->participant_id)
            ->pluck('particular_id');
        $contributions = DB::table('event_particular')
            ->whereIn('particular_id', $headcountParticularIds)
            ->where('event_id', $event->event_id)
            ->whereNotIn('particular_id', $existingParticularIds)
            ->get(['particular_id'])
            ->map(fn ($particular) => [
                'event_id' => $event->event_id,
                'participant_id' => $participant->participant_id,
                'quarter_id' => $quarterId,
                'particular_id' => $particular->particular_id,
                'contributed_at' => $now,
            ])
            ->all();

        if ($contributions !== []) {
            DB::table('event_participant_contributions')->insert($contributions);
        }

        foreach (DB::table('event_particular')->where('event_id', $event->event_id)->pluck('particular_id') as $particularId) {
            $this->syncParticularItemTotal($quarterId, (int) $particularId);
        }
    }

    private function syncParticularItemTotal(int $quarterId, int $particularId): void
    {
        $participantCount = ReportParticipantCoverage::countFor($quarterId, $particularId);
        $item = DB::table('particular_items')
            ->where('quarter_id', $quarterId)
            ->where('particular_id', $particularId)
            ->lockForUpdate()
            ->first();

        if ($item) {
            $manualValue = $item->manual_value;
            DB::table('particular_items')
                ->where('item_id', $item->item_id)
                ->update([
                    'value' => $manualValue === null && $participantCount === 0
                        ? null
                        : ($manualValue ?? 0) + $participantCount,
                ]);

            return;
        }

        DB::table('particular_items')->insert([
            'quarter_id' => $quarterId,
            'particular_id' => $particularId,
            'manual_value' => null,
            'value' => $participantCount,
        ]);
    }
}
