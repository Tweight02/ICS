<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventParticipant extends Model
{
    protected $table = 'participants';
    protected $primaryKey = 'participant_id';
    public $timestamps = false;

    protected $fillable = [
        'event_id', 'church_id', 'first_name', 'middle_name', 'last_name',
        'extension_name', 'age', 'gender', 'registration_status',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id', 'event_id');
    }

    public function getNameAttribute(): string
    {
        return implode(' ', array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->extension_name,
        ]));
    }

    public function getStatusAttribute(): string
    {
        return strtolower($this->registration_status) === 'confirmed' ? 'confirmed' : 'pending';
    }
}
