<?php

namespace App\Http\Requests;

use App\Support\EventUser;
use App\Support\EventParticulars;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Carbon\Carbon;

class EventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return EventUser::fromRequest($this)->canWrite();
    }

    public function rules(): array
    {
        $user = EventUser::fromRequest($this);

        $scope = match ($user->role) {
            'district_pastor' => [
                'church_ids' => ['required', 'array', 'size:1'],
                'church_ids.*' => ['integer', 'distinct', Rule::exists('churches', 'church_id')],
            ],
            'assistant' => [
                'district_ids' => ['required', 'array', 'min:1'],
                'district_ids.*' => ['integer', 'distinct', Rule::exists('churches', 'church_id')],
            ],
            default => [],
        };

        return [
            'title' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'department_id' => ['required', 'integer', Rule::exists('departments', 'department_id')],
            'particular_ids' => ['required', 'array', 'min:1'],
            'particular_ids.*' => ['required', 'integer', 'distinct', Rule::exists('particulars', 'particular_id')],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:255'],
        ] + $scope;
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $user = EventUser::fromRequest($this);
            $programId = EventParticulars::rootProgramId(
                $this->input('particular_ids', []),
                $this->integer('department_id')
            );

            if (! $programId) {
                $validator->errors()->add('particular_ids', 'Choose one or more particulars from a single program in the selected department.');

                return;
            }

            $districtIds = array_map('intval', $this->input('district_ids', []));
            $churchId = match ($user->role) {
                'church_representative' => $user->churchId,
                'district_pastor' => (int) ($this->input('church_ids')[0] ?? 0),
                'assistant' => $districtIds[0] ?? 0,
                default => null,
            };

            if ($user->role === 'district_pastor') {
                $allowed = array_merge([$user->districtId], \App\Support\EventsOrg::churchIdsOfDistrict($user->districtId));
                if (! in_array($churchId, array_map('intval', array_filter($allowed)), true)) {
                    $validator->errors()->add('church_ids', 'Choose one church from your own district.');
                }
            }

            if ($user->role === 'assistant') {
                $validDistrictCount = DB::table('churches')
                    ->whereIn('church_id', $districtIds)
                    ->whereNull('parent_id')
                    ->count();
                if ($validDistrictCount !== count($districtIds)) {
                    $validator->errors()->add('district_ids', 'Choose one or more valid districts.');
                }
            }

            $eventDate = Carbon::createFromFormat('!Y-m-d', $this->input('start_date'));
            $quarter = 'Q'.(int) ceil($eventDate->month / 3);
            if ($churchId && ! DB::table('quarters')
                ->where('church_id', $churchId)
                ->where('program_id', $programId)
                ->where('year', (string) $eventDate->year)
                ->where('quarter', $quarter)
                ->exists()) {
                $validator->errors()->add('particular_ids', 'No reporting quarter exists for this church, event date, and the selected particulars.');
            }

            if ($this->input('start_date') === $this->input('end_date')
                && $this->input('end_time') <= $this->input('start_time')) {
                $validator->errors()->add('end_time', 'End time must be after the start time.');
            }
        }];
    }
}
