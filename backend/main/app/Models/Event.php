<?php

namespace App\Modules\Events\Models;

use App\Modules\Events\Support\EventsOrg;
use App\Modules\Events\Support\EventUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Event extends Model
{
    protected $table = 'church_events';

    protected $fillable = [
        'title', 'location', 'department_id', 'year', 'quarter',
        'start_date', 'end_date', 'start_time', 'end_time',
        'all_districts', 'notes', 'organizer_role', 'scope_label', 'created_by',
    ];

    protected function casts(): array
    {
        return ['start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d', 'all_districts' => 'boolean'];
    }

    public function participants(): HasMany { return $this->hasMany(EventParticipant::class, 'event_id'); }

    /** upcoming | ongoing | completed, computed from the dates (Philippine time). */
    public function getStatusAttribute(): string
    {
        $today = now('Asia/Manila')->startOfDay();

        return match (true) {
            $this->start_date->gt($today) => 'upcoming',
            $this->end_date->lt($today) => 'completed',
            default => 'ongoing',
        };
    }

    // ---- links to your tables (plain id columns, no foreign keys) ----
    public function ids(string $table, string $column): array
    {
        return DB::table($table)->where('event_id', $this->id)->pluck($column)->map(fn ($v) => (int) $v)->all();
    }

    public function syncIds(string $table, string $column, array $ids): void
    {
        DB::table($table)->where('event_id', $this->id)->delete();
        DB::table($table)->insert(array_map(
            fn ($id) => ['event_id' => $this->id, $column => (int) $id],
            array_values(array_unique($ids))
        ));
    }

    /** Only the events a user is allowed to see. */
    public function scopeVisibleTo(Builder $query, EventUser $u): Builder
    {
        $withChurch = fn (array $ids) => DB::table('church_event_church')->whereIn('church_id', $ids)->select('event_id');
        $withDistrict = fn (?int $id) => DB::table('church_event_district')->where('district_id', $id)->select('event_id');

        return match ($u->role) {
            'director', 'assistant' => $query,
            'district_pastor' => $query->where(fn ($w) => $w
                ->where('all_districts', true)
                ->orWhere('created_by', $u->id)
                ->orWhereIn('id', $withDistrict($u->districtId))
                ->orWhereIn('id', $withChurch(EventsOrg::churchIdsOfDistrict($u->districtId)))),
            default => $query->where(fn ($w) => $w // church_representative
                ->where('all_districts', true)
                ->orWhere('created_by', $u->id)
                ->orWhereIn('id', $withChurch([$u->churchId ?? 0]))
                ->orWhereIn('id', $withDistrict($u->districtId))),
        };
    }

    public static function canChange(EventUser $u, self $event): bool
    {
        return $u->canWrite() && $event->created_by === $u->id;
    }
}
