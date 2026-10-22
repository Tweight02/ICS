<?php

namespace App\Modules\Events\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/**
 * The logged-in user, translated to the four roles the events screens use:
 * director | assistant | district_pastor | church_representative.
 */
final class EventUser
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public string $role,
        public ?int $churchId,
        public ?int $districtId,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return $request->attributes->get('event_user') ?? tap(
            self::from($request->user()),
            fn (self $u) => $request->attributes->set('event_user', $u)
        );
    }

    public static function from(?Authenticatable $u): self
    {
        abort_unless($u, 401);

        $raw = $u->role instanceof \BackedEnum ? $u->role->value : (string) $u->role;
        $role = self::normalize($raw);
        abort_if($role === 'none', 403, 'Your role cannot use the events module.');

        $id = (int) ($u->user_id ?? $u->getKey());
        $name = trim(implode(' ', array_filter([$u->first_name ?? null, $u->last_name ?? null]))) ?: (string) ($u->name ?? 'User');
        $churchId = ! empty($u->church_id) ? (int) $u->church_id : null;
        $districtId = match ($role) {
            'district_pastor' => EventsOrg::districtOfPastor($id),
            'church_representative' => $churchId ? ($c = EventsOrg::church($churchId)) ? (int) $c->district_id : null : null,
            default => null,
        };

        return new self($id, $name, (string) ($u->email ?? ''), $role, $churchId, $districtId);
    }

    /** Your stored role names (several spellings) -> the 4 module roles. */
    public static function normalize(string $raw): string
    {
        $r = strtolower(trim(str_replace(['-', '_'], ' ', $raw)));

        return match (true) {
            in_array($r, ['pastor', 'district pastor'], true) => 'district_pastor',
            $r === 'representative' => 'church_representative',
            in_array($r, ['assistant', 'administrative assistant'], true) => 'assistant',
            $r === 'director' => 'director',
            default => 'none',
        };
    }

    public static function label(string $role): string
    {
        return ['director' => 'Director / Admin', 'assistant' => 'Assistant', 'district_pastor' => 'District Pastor',
            'church_representative' => 'Church Representative'][$role] ?? $role;
    }

    /** Directors are read-only. */
    public function canWrite(): bool
    {
        return $this->role !== 'director';
    }
}
