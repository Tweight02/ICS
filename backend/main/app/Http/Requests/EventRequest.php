<?php

namespace App\Modules\Events\Http\Requests;

use App\Modules\Events\Support\EventsOrg;
use App\Modules\Events\Support\EventUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class EventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return EventUser::fromRequest($this)->canWrite();
    }

    public function rules(): array
    {
        $user = EventUser::fromRequest($this);
        $dept = config('events.tables.departments');
        $part = config('events.tables.particulars');
        $dist = config('events.tables.districts');

        $scope = match ($user->role) {
            'district_pastor' => [
                'church_ids' => ['required', 'array', 'min:1'],
                'church_ids.*' => ['integer', 'distinct'],
            ],
            'assistant' => [
                'all_districts' => ['required', 'boolean'],
                'district_ids' => ['exclude_if:all_districts,true', 'required', 'array', 'min:1'],
                'district_ids.*' => ['integer', 'distinct', Rule::exists($dist['table'], $dist['id'])],
            ],
            default => [],
        };

        return [
            'title' => ['required', 'string', 'max:150'],
            'location' => ['required', 'string', 'max:150'],
            'year' => ['required', 'integer', 'between:2020,2100'],
            'quarter' => ['required', 'integer', 'between:1,4'],
            'department_id' => ['required', Rule::exists($dept['table'], $dept['id'])],
            'particular_ids' => ['required', 'array', 'min:1'],
            'particular_ids.*' => ['integer', 'distinct', Rule::exists($part['table'], $part['id'])],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ] + $scope;
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $user = EventUser::fromRequest($this);

            if (! EventsOrg::particularsBelongTo($this->input('particular_ids'), $this->integer('department_id'))) {
                $validator->errors()->add('particular_ids', 'Selected particulars must belong to the chosen department.');
            }

            if ($user->role === 'district_pastor') {
                $allowed = EventsOrg::churchIdsOfDistrict($user->districtId);
                if (array_diff($this->input('church_ids'), $allowed)) {
                    $validator->errors()->add('church_ids', 'You can only choose churches from your own district.');
                }
            }

            if ($this->input('start_date') === $this->input('end_date')
                && $this->input('end_time') <= $this->input('start_time')) {
                $validator->errors()->add('end_time', 'End time must be after the start time.');
            }
        }];
    }
}
