<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Death extends Model
{
    protected $table = 'deaths';

    public $timestamps = false;

    protected $primaryKey = 'death_id';

    protected $fillable = [
        'baptism_id',
        'quarter',
        'date_of_death',
    ];

    /**
     * Get the baptism record linked to this death record.
     */
    public function baptism(): BelongsTo
    {
        return $this->belongsTo(
            Baptism::class,
            'baptism_id',
            'baptism_id'
        );
    }
}