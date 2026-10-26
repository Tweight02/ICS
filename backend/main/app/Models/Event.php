<?php

namespace App\Models;

use App\Support\EventsOrg;
use App\Support\EventUser;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\DB;

class Event extends Model
{
    protected $table = 'events';
    protected $primaryKey = 'event_id';
    public $timestamps = false;

    protected $fillable = [
        'quarter_id', 'church_id', 'title', 'start_date', 'end_date',
        'start_time', 'end_time', 'notes', 'status', 'location',
    ];

    protected function casts(): array
    {
        return ['date_start' => 'date:Y-m-d', 'date_end' => 'date:Y-m-d'];
    }

    public function getIdAttribute(): int
    {
        return (int) $this->event_id;
    }

    public function getStartDateAttribute(): ?Carbon
    {
        return isset($this->attributes['date_start']) ? Carbon::parse($this->attributes['date_start']) : null;
    }

    public function setStartDateAttribute(string $value): void
    {
        $this->attributes['date_start'] = $value;
    }

    public function getEndDateAttribute(): ?Carbon
    {
        return isset($this->attributes['date_end']) ? Carbon::parse($this->attributes['date_end']) : null;
    }

    public function setEndDateAttribute(string $value): void
    {
        $this->attributes['date_end'] = $value;
    }

    public function getStartTimeAttribute(): ?string
    {
        return $this->attributes['time_start'] ?? null;
    }

    public function setStartTimeAttribute(string $value): void
    {
        $this->attributes['time_start'] = $value;
    }

    public function getEndTimeAttribute(): ?string
    {
        return $this->attributes['time_end'] ?? null;
    }

    public function setEndTimeAttribute(string $value): void
    {
        $this->attributes['time_end'] = $value;
    }

    public function getNotesAttribute(): string
    {
        return (string) ($this->attributes['details'] ?? '');
    }

    public function setNotesAttribute(?string $value): void
    {
        $this->attributes['details'] = mb_substr($value ?? '', 0, 255);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(EventParticipant::class, 'event_id', 'event_id');
    }

    public function particulars(): BelongsToMany
    {
        return $this->belongsToMany(Particular::class, 'event_particular', 'event_id', 'particular_id');
    }

    public function districts(): BelongsToMany
    {
        return $this->belongsToMany(Church::class, 'event_district', 'event_id', 'district_id');
    }

    public function createdBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'event_creator', 'event_id', 'user_id', 'event_id', 'user_id');
    }

    public function scopeVisibleTo(Builder $query, EventUser $user): Builder
    {
        if ($user->role !== 'church_representative') {
            if (! $user->departmentId) {
                return $query->whereRaw('1 = 0');
            }

            $query->whereIn('quarter_id', DB::table('quarters')
                ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
                ->where('programs.department_id', $user->departmentId)
                ->select('quarters.quarter_id'));
        }

        if ($user->role === 'district_pastor') {
            $districtChurchIds = array_merge(
                [$user->districtId],
                EventsOrg::churchIdsOfDistrict($user->districtId)
            );

            return $query->where(function (Builder $scope) use ($districtChurchIds, $user) {
                $scope->whereIn('church_id', $districtChurchIds)
                    ->orWhereHas('districts', fn (Builder $districts) => $districts
                        ->where('churches.church_id', $user->districtId));
            });
        }

        return match ($user->role) {
            'director', 'assistant' => $query,
            'church_representative' => $query->where(function (Builder $scope) use ($user) {
                $scope->whereIn('church_id', array_values(array_filter([
                    $user->churchId,
                    $user->districtId,
                ])));
                if ($user->districtId) {
                    $scope->orWhereHas('districts', fn (Builder $districts) => $districts
                        ->where('churches.church_id', $user->districtId));
                }
            }),
            default => $query->where('church_id', $user->churchId ?? 0),
        };
    }

    public static function canChange(EventUser $user, self $event): bool
    {
        if (! $user->canWrite() || ! $event->createdBy()->where('users.user_id', $user->id)->exists()) {
            return false;
        }

        return match ($user->role) {
            'assistant' => true,
            'district_pastor' => in_array(
                (int) $event->church_id,
                array_merge([$user->districtId], EventsOrg::churchIdsOfDistrict($user->districtId)),
                true
            ),
            default => (int) $event->church_id === $user->churchId,
        };
    }

    public function quarterDetails(): ?object
    {
        return DB::table('quarters')
            ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
            ->join('departments', 'departments.department_id', '=', 'programs.department_id')
            ->where('quarters.quarter_id', $this->quarter_id)
            ->select([
                'quarters.year',
                'quarters.quarter',
                'programs.program_id',
                'programs.program_name',
                'departments.department_id',
                'departments.department_name',
            ])->first();
    }
}
