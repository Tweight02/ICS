<?php

namespace App\Modules\Events\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventParticipant extends Model
{
    protected $table = 'church_event_participants';
    protected $fillable = ['event_id', 'name', 'role', 'status'];

    public function event(): BelongsTo { return $this->belongsTo(Event::class, 'event_id'); }
}
