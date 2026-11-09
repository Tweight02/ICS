<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Support\EventDepartments;
use App\Support\EventParticulars;
use App\Support\EventRegistrationAttribution;
use App\Support\EventsOrg;
use App\Support\EventUser;
use Carbon\Carbon;
use Illuminate\Http\Request;
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
        $query = $this->getVisibleEvents(EventUser::fromRequest($request))->withCount([
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

        $rows = $this->getVisibleEvents(EventUser::fromRequest($request))
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
        $result = DB::transaction(function () use ($request, $user) {
            $departmentId = $request->departmentId();
            DB::table('departments')
                ->where('department_id', $departmentId)
                ->lockForUpdate()
                ->first();

            $conflict = $this->overlappingEvent($request, $user);
            if ($conflict) {
                return ['conflict' => $conflict];
            }

            $event = Event::create($this->eventData($request));
            $event->createdBy()->attach($user->id);
            $event->particulars()->sync($request->validated('particular_ids'));
            if ($user->role === 'assistant') {
                $districtIds = EventsOrg::districts()->pluck('id')->map(fn ($id) => (int) $id)->all();
                $event->districts()->sync($districtIds);
            } elseif ($user->role === 'district_pastor') {
                $event->districts()->sync([$user->districtId]);
                $event->churches()->sync($request->validated('church_ids'));
            }

            return ['event' => $event];
        });

        if (isset($result['conflict'])) {
            return $this->overlapResponse($result['conflict']);
        }

        $event = $result['event'];

        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function update(EventRequest $request, int $event)
    {
        $user = EventUser::fromRequest($request);
        $event = $this->find($request, $event);
        abort_unless(Event::canChange($user, $event), 403);
        $result = DB::transaction(function () use ($event, $request, $user) {
            $departmentId = $request->departmentId();
            DB::table('departments')
                ->where('department_id', $departmentId)
                ->lockForUpdate()
                ->first();

            $conflict = $this->overlappingEvent($request, $user, (int) $event->event_id);
            if ($conflict) {
                return ['conflict' => $conflict];
            }

            $event->fill($this->eventData($request))->save();
            $event->particulars()->sync($request->validated('particular_ids'));
            $event->created_by = $user->id;
            $event->save();
            if ($user->role === 'assistant') {
                $districtIds = EventsOrg::districts()->pluck('id')->map(fn ($id) => (int) $id)->all();
                $event->districts()->sync($districtIds);
            } elseif ($user->role === 'district_pastor') {
                $event->districts()->sync([$user->districtId]);
                $event->churches()->sync($request->validated('church_ids'));
            }

            return ['event' => $event->refresh()];
        });

        if (isset($result['conflict'])) {
            return $this->overlapResponse($result['conflict']);
        }

        return new EventResource($result['event']);
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
            'assistant' => (int) (EventsOrg::districts()->first()->id ?? 0),
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

        $districtId = $user->role === 'district_pastor'
            ? $user->districtId
            : ($user->role === 'church_representative' ? $user->districtId : null);
        $scopeType = match ($user->role) {
            'assistant' => 'MISSION',
            'district_pastor' => 'DISTRICT',
            'church_representative' => 'CHURCH',
            default => null,
        };
        $scopeId = match ($user->role) {
            'assistant' => Event::MISSION_SCOPE_ID,
            'district_pastor' => $user->districtId,
            'church_representative' => $user->churchId,
            default => null,
        };

        return [
            'church_id' => $churchId,
            'host_church_id' => $request->hostChurchId(),
            'quarter_id' => $quarterId,
            'created_by' => $user->id,
            'creator_role' => strtoupper(str_replace('-', '_', $user->role)),
            'scope_type' => $scopeType,
            'scope_id' => $scopeId,
            'district_id' => $districtId,
            'department_id' => $departmentId,
            'title' => $request->validated('title'),
            'location' => $request->validated('location'),
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date'),
            'start_time' => $request->validated('start_time'),
            'end_time' => $request->validated('end_time'),
            'notes' => $request->validated('notes'),
            'status' => 'ACTIVE',
        ];
    }

    private function overlappingEvent(
        EventRequest $request,
        EventUser $user,
        ?int $ignoreEventId = null
    ): ?object {
        $startDateTime = Carbon::parse($request->validated('start_date').' '.$request->validated('start_time'));
        $endDateTime = Carbon::parse($request->validated('end_date').' '.$request->validated('end_time'));
        $query = DB::table('events')
            ->where('department_id', $request->departmentId())
            ->whereRaw('LOWER(status) != ?', ['cancelled'])
            ->whereDate('date_start', '<=', $endDateTime->toDateString())
            ->whereDate('date_end', '>=', $startDateTime->toDateString());

        if ($ignoreEventId) {
            $query->where('event_id', '!=', $ignoreEventId);
        }

        if ($user->role === 'district_pastor') {
            $query->where(function ($scope) use ($user) {
                $scope->where('scope_type', 'MISSION')
                    ->orWhere('district_id', $user->districtId);
            });
        } elseif ($user->role === 'church_representative') {
            $query->where(function ($scope) use ($user) {
                $scope->where('scope_type', 'MISSION')
                    ->orWhere('district_id', $user->districtId)
                    ->orWhere(function ($church) use ($user) {
                        $church->where('scope_type', 'CHURCH')
                            ->where('scope_id', $user->churchId);
                    });
            });
        }

        $candidates = $query->get([
            'event_id', 'title', 'date_start', 'date_end', 'time_start', 'time_end',
        ]);
        $start = Carbon::parse($request->validated('start_date').' '.$request->validated('start_time'));
        $end = Carbon::parse($request->validated('end_date').' '.$request->validated('end_time'));

        return $candidates->first(function (object $event) use ($start, $end): bool {
            $existingStart = Carbon::parse($event->date_start.' '.$event->time_start);
            $existingEnd = Carbon::parse($event->date_end.' '.$event->time_end);

            return $existingStart->lt($end) && $start->lt($existingEnd);
        });
    }

    private function overlapResponse(object $event)
    {
        $start = Carbon::parse($event->date_start.' '.$event->time_start);
        $end = Carbon::parse($event->date_end.' '.$event->time_end);

        return response()->json([
            'code' => 'EVENT_SCHEDULE_OVERLAP',
            'message' => sprintf(
                'Date/time overlap with existing event: %s - %s to %s',
                $event->title,
                $start->format('M j, Y g:i A'),
                $end->format('M j, Y g:i A')
            ),
        ], 409);
    }

    private function getVisibleEvents(EventUser $user)
    {
        return Event::visibleTo($user);
    }

    private function find(Request $request, int $id): Event
    {
        return $this->getVisibleEvents(EventUser::fromRequest($request))->findOrFail($id);
    }

    private function monthRange(string $month): array
    {
        $start = Carbon::createFromFormat('!Y-m', $month)->startOfMonth();

        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }
}
