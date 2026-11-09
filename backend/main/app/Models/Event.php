<?php

namespace App\Models;

use App\Support\EventsOrg;
use App\Support\EventUser;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Event extends Model
{
    public const MISSION_SCOPE_ID = 1;

    protected $table = 'events';

    protected $primaryKey = 'event_id';

    public $timestamps = false;

    protected $fillable = [
        'quarter_id', 'church_id', 'host_church_id', 'title', 'start_date', 'end_date',
        'start_time', 'end_time', 'notes', 'status', 'location', 'created_by',
        'creator_role', 'scope_type', 'scope_id', 'district_id', 'department_id',
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
        $this->attributes['details'] = $value ?? '';
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

    public function churches(): BelongsToMany
    {
        return $this->belongsToMany(Church::class, 'event_church', 'event_id', 'church_id');
    }

    public function createdBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'event_creator', 'event_id', 'user_id', 'event_id', 'user_id');
    }

    public function scopeVisibleTo(Builder $query, EventUser $user): Builder
    {
        if ($user->role === 'assistant') {
            return $query;
        }

        if ($user->role === 'director') {
            return $user->departmentId
                ? $query->where(function (Builder $scope) use ($user) {
                    $scope->where('department_id', $user->departmentId)
                        ->orWhere(function (Builder $legacy) use ($user) {
                            $legacy->whereNull('department_id')
                                ->whereIn('quarter_id', DB::table('quarters')
                                    ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
                                    ->where('programs.department_id', $user->departmentId)
                                    ->select('quarters.quarter_id'));
                        });
                })
                : $query->whereRaw('1 = 0');
        }

        return match ($user->role) {
            'district_pastor' => $user->districtId
                ? $query->where(function (Builder $scope) use ($user) {
                    $scope->where('scope_type', 'MISSION')
                        ->orWhere('district_id', $user->districtId)
                        ->orWhere(function (Builder $legacy) use ($user) {
                            $legacy->whereNull('scope_type')
                                ->where(function (Builder $targets) use ($user) {
                                    $targets->whereIn('church_id', array_merge(
                                        [$user->districtId],
                                        EventsOrg::churchIdsOfDistrict($user->districtId)
                                    ))->orWhereHas('districts', fn (Builder $districts) => $districts
                                        ->where('churches.church_id', $user->districtId));
                                });
                        });
                })
                : $query->whereRaw('1 = 0'),
            'church_representative' => $user->churchId
                ? $query->where(function (Builder $scope) use ($user) {
                    $scope->where('scope_type', 'MISSION')
                        ->orWhere(function (Builder $districtScope) use ($user) {
                            $districtScope->where('scope_type', 'DISTRICT')
                                ->where('district_id', $user->districtId);
                        })
                        ->orWhere(function (Builder $churchScope) use ($user) {
                            $churchScope->where('scope_type', 'CHURCH')
                                ->where('scope_id', $user->churchId);
                        })->orWhere(function (Builder $legacy) use ($user) {
                            $legacy->whereNull('scope_type')
                                ->where(function (Builder $targets) use ($user) {
                                    $targets->whereIn('church_id', array_values(array_filter([
                                        $user->churchId,
                                        $user->districtId,
                                    ])));
                                    if ($user->churchId) {
                                        $targets->orWhereHas('churches', fn (Builder $churches) => $churches
                                            ->where('churches.church_id', $user->churchId));
                                    }
                                    if ($user->districtId) {
                                        $targets->orWhereHas('districts', fn (Builder $districts) => $districts
                                            ->where('churches.church_id', $user->districtId));
                                    }
                                });
                        });
                })
                : $query->whereRaw('1 = 0'),
            default => $query->whereRaw('1 = 0'),
        };
    }

    public static function canView(EventUser $user, self $event): bool
    {
        return $event->exists
            && self::query()->visibleTo($user)->whereKey($event->getKey())->exists();
    }

    public function coversChurch(int $churchId): bool
    {
        if ($this->scope_type === 'MISSION') {
            return true;
        }

        $church = EventsOrg::church($churchId);
        $districtId = $church?->district_id
            ? (int) $church->district_id
            : ($church ? (int) $church->id : null);
        if ($this->scope_type === 'DISTRICT') {
            return $districtId !== null && $districtId === (int) $this->district_id;
        }
        if ($this->scope_type === 'CHURCH') {
            return (int) $this->scope_id === $churchId;
        }

        if ($this->churches()->where('churches.church_id', $churchId)->exists()) {
            return true;
        }

        if (! $church) {
            return false;
        }

        $districtId ??= (int) $church->id;

        if ($this->districts()->where('churches.church_id', $districtId)->exists()) {
            return true;
        }

        return (int) $this->church_id === $churchId;
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
