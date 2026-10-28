<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\EventsOrg;
use App\Support\EventUser;
use Illuminate\Http\Request;

/** GET /api/me : the logged-in user in the shape the Angular events screens expect. */
class MeController extends Controller
{
    public function __invoke(Request $request)
    {
        $u = EventUser::fromRequest($request);
        $church = EventsOrg::church($u->churchId);
        $district = EventsOrg::district($u->districtId);

        return response()->json(['data' => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'role_label' => EventUser::label($u->role),
            'church' => $church ? ['id' => (int) $church->id, 'name' => $church->name] : null,
            'district' => $district ? ['id' => (int) $district->id, 'name' => $district->name] : null,
        ]]);
    }
}
