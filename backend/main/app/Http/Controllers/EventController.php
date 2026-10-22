<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Department;
use App\Models\Program;
use App\Modules\Events\Http\Requests\EventRequest;
use App\Modules\Events\Http\Resources\EventResource;
use App\Modules\Events\Support\EventsOrg;
use App\Modules\Events\Support\EventUser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    private const FIELDS = [
        'title', 'location', 'year', 'quarter', 'department_id',
        'start_date', 'end_date', 'start_time', 'end_time', 'notes',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'status' => ['nullable', 'in:upcoming,ongoing,completed,all'],
        ]);

        $user = EventUser::fromRequest($request);
        $today = now('Asia/Manila')->toDateString();

        $query = Event::visibleTo($user)->withCount([
            'participants',
            'participants as confirmed_count' => fn ($q) => $q->where('status', 'confirmed'),
        ]);

        if ($request->boolean('mine')) {
            $query->where('created_by', $user->id);
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'like', '%'.$search.'%');
        }
        if ($month = $request->query('month')) {
            [$start, $end] = $this->monthRange($month);
            $query->where('start_date', '<=', $end)->where('end_date', '>=', $start);
        }

        match ($request->query('status', 'upcoming')) {
            'upcoming' => $query->where('start_date', '>', $today),
            'ongoing' => $query->where('start_date', '<=', $today)->where('end_date', '>=', $today),
            'completed' => $query->where('end_date', '<', $today),
            default => null,
        };

        $perPage = min(max((int) $request->query('per_page', 5), 1), 50);

        return EventResource::collection($query->orderBy('start_date')->orderBy('start_time')->paginate($perPage));
    }

    public function calendar(Request $request)
    {
        $request->validate(['month' => ['required', 'date_format:Y-m']]);
        [$start, $end] = $this->monthRange($request->query('month'));

        $rows = Event::visibleTo(EventUser::fromRequest($request))
            ->where('start_date', '<=', $end)->where('end_date', '>=', $start)
            ->orderBy('start_date')->get(['id', 'title', 'start_date', 'end_date']);

        return response()->json(['data' => $rows->map(fn ($e) => [
            'id' => $e->id, 'title' => $e->title,
            'start_date' => $e->start_date->toDateString(), 'end_date' => $e->end_date->toDateString(),
        ])]);
    }

    public function show(Request $request, int $event)
    {
        return new EventResource($this->find($request, $event));
    }

    public function store(EventRequest $request)
    {
        $user = EventUser::fromRequest($request);

        $event = DB::transaction(function () use ($request, $user) {
            $event = Event::create($request->safe()->only(self::FIELDS) + [
                'organizer_role' => $user->role,
                'created_by' => $user->id,
                'all_districts' => $user->role === 'assistant' && $request->boolean('all_districts'),
                'scope_label' => $this->scopeLabel($user),
            ]);
            $this->syncRelations($event, $request, $user);

            return $event;
        });

        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function update(EventRequest $request, int $event)
    {
        $user = EventUser::fromRequest($request);
        $event = $this->find($request, $event);
        abort_unless(Event::canChange($user, $event), 403);

        DB::transaction(function () use ($request, $event, $user) {
            $event->fill($request->safe()->only(self::FIELDS));
            $event->all_districts = $user->role === 'assistant' && $request->boolean('all_districts');
            $event->scope_label = $this->scopeLabel($user);
            $event->save();
            $this->syncRelations($event, $request, $user);
        });

        return new EventResource($event->refresh());
    }

    public function destroy(Request $request, int $event)
    {
        $event = $this->find($request, $event);
        abort_unless(Event::canChange(EventUser::fromRequest($request), $event), 403);

        DB::transaction(function () use ($event) {
            foreach (['church_event_particular', 'church_event_church', 'church_event_district'] as $table) {
                DB::table($table)->where('event_id', $event->id)->delete();
            }
            $event->participants()->delete();
            $event->delete();
        });

        return response()->noContent();
    }

    private function find(Request $request, int $id): Event
    {
        return Event::visibleTo(EventUser::fromRequest($request))->findOrFail($id);
    }

    private function syncRelations(Event $event, EventRequest $request, EventUser $user): void
    {
        $event->syncIds('church_event_particular', 'particular_id', $request->validated('particular_ids'));

        match ($user->role) {
            'church_representative' => $event->syncIds('church_event_church', 'church_id', array_filter([$user->churchId])),
            'district_pastor' => $event->syncIds('church_event_church', 'church_id', $request->validated('church_ids')),
            'assistant' => $event->syncIds('church_event_district', 'district_id',
                $event->all_districts ? [] : $request->validated('district_ids')),
            default => null,
        };
    }

    private function scopeLabel(EventUser $user): string
    {
        return match ($user->role) {
            'church_representative' => EventsOrg::church($user->churchId)?->name ?? 'Church',
            'district_pastor' => EventsOrg::district($user->districtId)?->name ?? 'District',
            default => 'Mission-wide',
        };
    }

    private function monthRange(string $month): array
    {
        $start = Carbon::createFromFormat('!Y-m', $month)->startOfMonth();

        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }
}
