<?php

namespace App\Modules\Events\Http\Resources;

use App\Modules\Events\Models\Event;
use App\Modules\Events\Support\EventsOrg;
use App\Modules\Events\Support\EventUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = EventUser::fromRequest($request);
        $particularIds = $this->ids('church_event_particular', 'particular_id');
        $department = EventsOrg::department($this->department_id);
        $total = $this->participants_count ?? $this->participants()->count();
        $confirmed = $this->confirmed_count ?? $this->participants()->where('status', 'confirmed')->count();
        $can = Event::canChange($user, $this->resource);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'location' => $this->location,
            'year' => $this->year,
            'quarter' => $this->quarter,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'start_time' => substr($this->start_time, 0, 5),
            'end_time' => substr($this->end_time, 0, 5),
            'status' => $this->status,
            'notes' => $this->notes,
            'department' => ['id' => (int) $this->department_id, 'name' => $department['name'] ?? '—'],
            'particular_ids' => $particularIds,
            // Every program group of the department, with the particulars selected for this event.
            'programs' => collect($department['groups'] ?? [])->map(fn ($g) => [
                'id' => $g['id'],
                'name' => $g['name'],
                'selected' => collect($g['particulars'])->whereIn('id', $particularIds)->pluck('name')->values(),
            ])->values(),
            'scope' => [
                'label' => $this->scope_label,
                'all_districts' => $this->all_districts,
                'churches' => EventsOrg::churchNames($this->ids('church_event_church', 'church_id')),
                'districts' => EventsOrg::districtNames($this->ids('church_event_district', 'district_id')),
            ],
            'organized_by' => ['role' => EventUser::label($this->organizer_role), 'org' => 'The East Luzon Mission'],
            'participants' => ['total' => $total, 'confirmed' => $confirmed, 'pending' => $total - $confirmed],
            'abilities' => ['update' => $can, 'delete' => $can],
        ];
    }
}
