<?php

namespace App\Http\Resources;

use App\Models\Event;
use App\Support\EventsOrg;
use App\Support\EventUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = EventUser::fromRequest($request);
        $quarter = $this->quarterDetails();
        $church = EventsOrg::church((int) $this->church_id);
        $particulars = $this->particulars()->with('program')->get();
        $districts = $this->districts()->get(['churches.church_id as id', 'churches.name']);
        $total = $this->participants_count ?? $this->participants()->count();
        $confirmed = $this->confirmed_count ?? $this->participants()
            ->whereRaw('LOWER(registration_status) = ?', ['confirmed'])->count();
        $can = Event::canChange($user, $this->resource);
        $isDistrict = $church && ! $church->district_id;
        if ($districts->isEmpty() && $isDistrict) {
            $districts = collect([(object) ['id' => $church->id, 'name' => $church->name]]);
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'location' => $this->location,
            'year' => $quarter ? (int) $quarter->year : null,
            'quarter' => $quarter ? (int) substr($quarter->quarter, 1) : null,
            'quarter_id' => (int) $this->quarter_id,
            'program_id' => $quarter ? (int) $quarter->program_id : null,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'start_time' => substr($this->start_time, 0, 5),
            'end_time' => substr($this->end_time, 0, 5),
            'status' => $this->status,
            'notes' => $this->notes,
            'department' => $quarter ? [
                'id' => (int) $quarter->department_id,
                'name' => $quarter->department_name,
            ] : null,
            'particular_ids' => $particulars->pluck('particular_id')->map(fn ($id) => (int) $id)->values(),
            'programs' => $particulars->groupBy('program_id')->map(function ($items) {
                $program = $items->first()->program;

                return [
                    'id' => (int) $program->program_id,
                    'name' => $program->program_name,
                    'selected' => $items->pluck('particular_name')->values(),
                    'particulars' => $items->map(fn ($item) => [
                        'particular_id' => (int) $item->particular_id,
                        'particular_name' => $item->particular_name,
                    ])->values(),
                ];
            })->values(),
            'scope' => [
                'label' => $church->name ?? null,
                'churches' => $church && ! $isDistrict ? [['id' => (int) $church->id, 'name' => $church->name]] : [],
                'districts' => $districts->map(fn ($district) => [
                    'id' => (int) $district->id,
                    'name' => $district->name,
                ])->values(),
            ],
            'church_id' => (int) $this->church_id,
            'church_name' => $church->name ?? null,
            'organized_by' => null,
            'participants' => ['total' => $total, 'confirmed' => $confirmed, 'pending' => $total - $confirmed],
            'abilities' => [
                'update' => $can,
                'delete' => $can,
                'manage_participants' => $can,
            ],
        ];
    }
}
