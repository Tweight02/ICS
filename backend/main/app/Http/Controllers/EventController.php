<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Support\EventDepartments;
use App\Support\EventParticulars;
use App\Support\EventRegistrationAttribution;
use App\Support\EventUser;
use App\Support\EventsOrg;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function departments(Request $request)
    {
        $user = EventUser::fromRequest($request);

        return response()->json([
            'data' => EventDepartments::selectableFor($user->role)->get(),
        ]);
    }

    public function index(Request $request)
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'status' => ['nullable', 'in:upcoming,ongoing,completed,all'],
        ]);

        $today = now('Asia/Manila')->toDateString();
        $query = Event::visibleTo(EventUser::fromRequest($request))->withCount([
            'participants',
            'participants as confirmed_count' => fn ($q) => $q->whereRaw('LOWER(registration_status) = ?', ['confirmed']),
        ]);

        if ($search = $request->query('search')) {
            $query->where('title', 'like', '%'.$search.'%');
        }
        if ($month = $request->query('month')) {
            [$start, $end] = $this->monthRange($month);
            $query->where('date_start', '<=', $end)->where('date_end', '>=', $start);
        }

        match ($request->query('status', 'upcoming')) {
            'upcoming' => $query->where('date_start', '>', $today),
            'ongoing' => $query->where('date_start', '<=', $today)->where('date_end', '>=', $today),
            'completed' => $query->where('date_end', '<', $today),
            default => null,
        };

        $perPage = min(max((int) $request->query('per_page', 5), 1), 50);

        return EventResource::collection($query->orderBy('date_start')->orderBy('time_start')->paginate($perPage));
    }

    public function calendar(Request $request)
    {
        $request->validate(['month' => ['required', 'date_format:Y-m']]);
        [$start, $end] = $this->monthRange($request->query('month'));

        $rows = Event::visibleTo(EventUser::fromRequest($request))
            ->where('date_start', '<=', $end)->where('date_end', '>=', $start)
            ->orderBy('date_start')->get(['event_id', 'title', 'date_start', 'date_end']);

        return response()->json(['data' => $rows->map(fn ($event) => [
            'id' => $event->event_id,
            'title' => $event->title,
            'start_date' => $event->start_date->toDateString(),
            'end_date' => $event->end_date->toDateString(),
        ])]);
    }

    public function show(Request $request, int $event)
    {
        return new EventResource($this->find($request, $event));
    }

    public function registrationLink(Request $request, int $event)
    {
        $user = EventUser::fromRequest($request);
        abort_unless($user->role === 'church_representative' && $user->churchId, 403);

        $event = $this->find($request, $event);
        abort_unless($event->coversChurch($user->churchId), 403, 'This event is not scheduled for your church.');
        EventRegistrationAttribution::quarterId((int) $event->quarter_id, $user->churchId);

        return response()->json([
            'data' => [
                'church_id' => $user->churchId,
                'registration_token' => EventRegistrationAttribution::token(
                    (int) $event->event_id,
                    $user->churchId
                ),
            ],
        ]);
    }

    public function store(EventRequest $request)
    {
        $user = EventUser::fromRequest($request);
        $targetChurchIds = match ($user->role) {
            'church_representative' => [$user->churchId],
            'district_pastor' => $request->validated('church_ids'),
            'assistant' => $request->validated('district_ids'),
            default => [],
        };
        $overlappingEvents = $this->overlappingEvents($request);
        $targetChurchIds = array_map('intval', array_filter($targetChurchIds));
        $existingDistrictTargets = DB::table('event_district')
            ->whereIn('event_id', $overlappingEvents->pluck('event_id')->unique())
            ->get(['event_id', 'district_id'])
            ->groupBy('event_id')
            ->map(fn ($targets) => $targets->pluck('district_id')->map(fn ($id) => (int) $id)->all());
        $existingChurchTargets = DB::table('event_church')
            ->whereIn('event_id', $overlappingEvents->pluck('event_id')->unique())
            ->get(['event_id', 'church_id'])
            ->groupBy('event_id')
            ->map(fn ($targets) => $targets->pluck('church_id')->map(fn ($id) => (int) $id)->all());
        $departmentId = $request->departmentId();
        $targetDistrictIds = array_values(array_unique(array_filter(array_map(
            fn (int $churchId) => EventsOrg::districtOfChurch($churchId),
            $targetChurchIds
        ))));
        $assistantScheduleConflict = $overlappingEvents->contains(
            function (object $event) use (
                $user,
                $departmentId,
                $targetDistrictIds,
                $existingDistrictTargets,
                $existingChurchTargets
            ): bool {
                $creatorRole = strtolower(trim(str_replace(
                    ['_', '-'],
                    ' ',
                    (string) $event->creator_role
                )));
                if (
                    (int) $event->department_id !== $departmentId ||
                    ($user->role !== 'assistant' && ! in_array(
                        $creatorRole,
                        ['assistant', 'administrative assistant'],
                        true
                    ))
                ) {
                    return false;
                }

                $existingTargets = array_merge(
                    [(int) $event->church_id],
                    $existingDistrictTargets->get($event->event_id, []),
                    $existingChurchTargets->get($event->event_id, [])
                );
                $existingDistrictIds = array_values(array_unique(array_filter(array_map(
                    fn (int $churchId) => EventsOrg::districtOfChurch($churchId),
                    array_map('intval', $existingTargets)
                ))));

                return count(array_intersect($targetDistrictIds, $existingDistrictIds)) > 0;
            }
        );

        $sameTargetConflict = $overlappingEvents->contains(function (object $event) use ($targetChurchIds, $existingDistrictTargets, $existingChurchTargets): bool {
            $existingTargets = array_merge(
                [(int) $event->church_id],
                $existingDistrictTargets->get($event->event_id, []),
                $existingChurchTargets->get($event->event_id, [])
            );

            return count(array_intersect($targetChurchIds, $existingTargets)) > 0;
        });

        $hasDifferentChurchConflict = $overlappingEvents->contains(function (object $event) use (
            $user,
            $targetChurchIds,
            $existingDistrictTargets,
            $existingChurchTargets
        ): bool {
            $existingTargets = array_merge(
                [(int) $event->church_id],
                $existingDistrictTargets->get($event->event_id, []),
                $existingChurchTargets->get($event->event_id, [])
            );

            return (int) $event->user_id !== $user->id
                && ! count(array_intersect($existingTargets, $targetChurchIds));
        });

        if ($overlappingEvents->isNotEmpty() && ! $request->boolean('confirm_overlap')) {
            $message = match (true) {
                $assistantScheduleConflict => 'An assistant event for this department and district overlaps this schedule.',
                $sameTargetConflict => 'An event already exists for the same church or district during this schedule.',
                $hasDifferentChurchConflict => "Another user's event is scheduled at a different church during this time.",
                default => 'Another event overlaps this schedule.',
            };

            return response()->json([
                'code' => 'EVENT_SCHEDULE_OVERLAP',
                'message' => $message.' Do you want to create this event anyway?',
            ], 409);
        }

        $event = DB::transaction(function () use ($request, $user) {
            $event = Event::create($this->eventData($request));
            $event->createdBy()->attach($user->id);
            $event->particulars()->sync($request->validated('particular_ids'));
            if ($user->role === 'assistant') {
                $event->districts()->sync($request->validated('district_ids'));
            } elseif ($user->role === 'district_pastor') {
                $event->churches()->sync($request->validated('church_ids'));
            }

            return $event;
        });

        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function update(EventRequest $request, int $event)
    {
        $user = EventUser::fromRequest($request);
        $event = $this->find($request, $event);
        abort_unless(Event::canChange($user, $event), 403);
        DB::transaction(function () use ($event, $request) {
            $event->fill($this->eventData($request))->save();
            $event->particulars()->sync($request->validated('particular_ids'));
            if (EventUser::fromRequest($request)->role === 'assistant') {
                $event->districts()->sync($request->validated('district_ids'));
            } elseif (EventUser::fromRequest($request)->role === 'district_pastor') {
                $event->churches()->sync($request->validated('church_ids'));
            }
        });

        return new EventResource($event->refresh());
    }

    public function destroy(Request $request, int $event)
    {
        $event = $this->find($request, $event);
        abort_unless(Event::canChange(EventUser::fromRequest($request), $event), 403);
        DB::transaction(function () use ($event) {
            $event->participants()->delete();
            $event->delete();
        });

        return response()->noContent();
    }

    private function eventData(EventRequest $request): array
    {
        $user = EventUser::fromRequest($request);
        $churchId = match ($user->role) {
            'church_representative' => $user->churchId,
            'district_pastor' => (int) $request->validated('church_ids')[0],
            'assistant' => (int) $request->validated('district_ids')[0],
            default => null,
        };

        $departmentId = $request->departmentId();
        $programId = EventParticulars::rootProgramId(
            $request->validated('particular_ids'),
            $departmentId
        );
        abort_unless($programId, 422, 'Choose particulars from one program in the selected department.');
        $eventDate = Carbon::createFromFormat('!Y-m-d', $request->validated('start_date'));

        $quarterId = DB::table('quarters')
            ->where('church_id', $churchId)
            ->where('program_id', $programId)
            ->where('year', (string) $eventDate->year)
            ->where('quarter', 'Q'.(int) ceil($eventDate->month / 3))
            ->value('quarter_id');

        abort_unless($churchId && $quarterId, 422, 'A matching church and reporting quarter are required.');

        return [
            'church_id' => $churchId,
            'quarter_id' => $quarterId,
            'title' => $request->validated('title'),
            'location' => $request->validated('location'),
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date'),
            'start_time' => $request->validated('start_time'),
            'end_time' => $request->validated('end_time'),
            'notes' => $request->validated('notes'),
            'status' => $this->eventStatus($request->validated('start_date'), $request->validated('end_date')),
        ];
    }

    /**
     * @return Collection<int, object>
     */
    private function overlappingEvents(EventRequest $request): Collection
    {
        $candidates = DB::table('events')
            ->join('event_creator', 'event_creator.event_id', '=', 'events.event_id')
            ->join('users as event_creators', 'event_creators.user_id', '=', 'event_creator.user_id')
            ->join('quarters', 'quarters.quarter_id', '=', 'events.quarter_id')
            ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
            ->whereDate('events.date_start', '<=', $request->validated('end_date'))
            ->whereDate('events.date_end', '>=', $request->validated('start_date'))
            ->get([
                'events.event_id',
                'events.date_start',
                'events.date_end',
                'events.time_start',
                'events.time_end',
                'events.church_id',
                'event_creator.user_id',
                'event_creators.role as creator_role',
                'programs.department_id',
            ]);
        $start = Carbon::parse($request->validated('start_date').' '.$request->validated('start_time'));
        $end = Carbon::parse($request->validated('end_date').' '.$request->validated('end_time'));

        return $candidates->filter(function (object $event) use ($start, $end): bool {
            $existingStart = Carbon::parse($event->date_start.' '.$event->time_start);
            $existingEnd = Carbon::parse($event->date_end.' '.$event->time_end);

            return $existingStart->lt($end) && $start->lt($existingEnd);
        })->values();
    }

    private function find(Request $request, int $id): Event
    {
        return Event::visibleTo(EventUser::fromRequest($request))->findOrFail($id);
    }

    private function eventStatus(string $startDate, string $endDate): string
    {
        $today = now('Asia/Manila')->toDateString();

        return match (true) {
            $startDate > $today => 'upcoming',
            $endDate < $today => 'completed',
            default => 'ongoing',
        };
    }

    private function monthRange(string $month): array
    {
        $start = Carbon::createFromFormat('!Y-m', $month)->startOfMonth();

        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }
}
