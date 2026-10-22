<?php

namespace App\Modules\Events\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Reads your existing tables (churches, districts, departments...) using config/events.php. */
final class EventsOrg
{
    private static array $memo = [];

    private static function t(string $key): array
    {
        return config("events.tables.$key");
    }

    /** SELECT with the configured columns renamed to fixed aliases. */
    private static function q(string $key, array $aliases)
    {
        $t = self::t($key);
        $select = [];
        foreach ($aliases as $alias => $col) {
            $select[] = $t[$col].' as '.$alias;
        }

        return DB::table($t['table'])->select($select);
    }

    // ---- churches & districts ----
    public static function church(?int $id): ?object
    {
        if (! $id) {
            return null;
        }

        return self::q('churches', ['id' => 'id', 'name' => 'name', 'location' => 'location', 'district_id' => 'district_id'])
            ->where(self::t('churches')['id'], $id)->first();
    }

    public static function churches(?int $districtId = null): Collection
    {
        $q = self::q('churches', ['id' => 'id', 'name' => 'name', 'location' => 'location', 'district_id' => 'district_id'])
            ->orderBy(self::t('churches')['name']);
        if ($districtId) {
            $q->where(self::t('churches')['district_id'], $districtId);
        }

        return $q->get();
    }

    public static function churchIdsOfDistrict(?int $districtId): array
    {
        return $districtId ? self::churches($districtId)->pluck('id')->map(fn ($v) => (int) $v)->all() : [];
    }

    public static function districts(): Collection
    {
        return self::q('districts', ['id' => 'id', 'name' => 'name'])->orderBy(self::t('districts')['id'])->get();
    }

    public static function district(?int $id): ?object
    {
        return $id ? self::q('districts', ['id' => 'id', 'name' => 'name'])->where(self::t('districts')['id'], $id)->first() : null;
    }

    /** District where this user is the pastor. */
    public static function districtOfPastor(int $userId): ?int
    {
        $d = self::t('districts');
        $id = DB::table($d['table'])->where($d['pastor_id'], $userId)->value($d['id']);

        return $id ? (int) $id : null;
    }

    public static function churchNames(array $ids): array
    {
        return $ids ? self::churches()->whereIn('id', $ids)->map(fn ($c) => ['id' => (int) $c->id, 'name' => $c->name])->values()->all() : [];
    }

    public static function districtNames(array $ids): array
    {
        return $ids ? self::districts()->whereIn('id', $ids)->map(fn ($d) => ['id' => (int) $d->id, 'name' => $d->name])->values()->all() : [];
    }

    // ---- departments -> program groups -> particulars ----
    public static function departments(): array
    {
        return self::$memo['departments'] ??= (function () {
            $groups = self::q('programs', ['id' => 'id', 'name' => 'name', 'department_id' => 'department_id'])
                ->orderBy(self::t('programs')['id'])->get()->groupBy('department_id');
            $parts = self::q('particulars', ['id' => 'id', 'name' => 'name', 'program_id' => 'program_id'])
                ->orderBy(self::t('particulars')['id'])->get()->groupBy('program_id');

            return self::q('departments', ['id' => 'id', 'name' => 'name'])->orderBy(self::t('departments')['id'])->get()
                ->map(fn ($dep) => [
                    'id' => (int) $dep->id,
                    'name' => $dep->name,
                    'groups' => ($groups[$dep->id] ?? collect())->map(fn ($g) => [
                        'id' => (int) $g->id,
                        'name' => $g->name,
                        'particulars' => ($parts[$g->id] ?? collect())
                            ->map(fn ($p) => ['id' => (int) $p->id, 'name' => $p->name])->values()->all(),
                    ])->values()->all(),
                ])->all();
        })();
    }

    public static function department(?int $id): ?array
    {
        return collect(self::departments())->firstWhere('id', $id);
    }

    /** True when every particular id belongs to a program of this department. */
    public static function particularsBelongTo(array $ids, int $departmentId): bool
    {
        $allowed = collect(self::department($departmentId)['groups'] ?? [])
            ->flatMap(fn ($g) => collect($g['particulars'])->pluck('id'))->all();

        return count($ids) > 0 && count(array_diff($ids, $allowed)) === 0;
    }
}
