<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Particular extends Model
{
    protected $table = 'particulars';
    protected $primaryKey = 'particular_id';
    public $timestamps = false;

    protected $fillable = [
        'program_id',
        'particular_name',
    ];

    public function program()
    {
        return $this->belongsTo(Program::class, 'program_id', 'program_id');
    }
}
