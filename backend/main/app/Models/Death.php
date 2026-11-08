<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Death extends Model
{
    protected $table = 'deaths';

    protected $primaryKey = 'death_id';

    public $timestamps = false;

    protected $fillable = [
        'baptism_id',
        'quarter',
        'date_of_death',
    ];

    /**
     * Get the person associated with this death record.
     *
     * Works for both actual baptism records and
     * manually entered death records.
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
