<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Baptism extends Model
{
    //
    protected $table = 'baptisms';
    public $timestamps = false;
    
    protected $primaryKey = 'baptism_id';

    protected $fillable = [
        'church_id',
        'baptism_id',
        'first_name',
        'middle_name',
        'last_name',
        'extension_name',
        'birthdate',
        'gender',
        'address',
        'officiating_minister',
        'place_of_baptism',
        'date_of_baptism',
        'marital_status',
        'is_reclaimed'



    ];
}
