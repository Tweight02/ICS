<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->participant_id,
            'name' => $this->name,
            'age' => $this->age,
            'gender' => $this->gender,
            'status' => $this->status,
            'initials' => collect(explode(' ', trim($this->name)))
                ->take(2)->map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)))->implode(''),
        ];
    }
}
