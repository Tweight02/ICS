<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Death extends Model
{
    //
     //
    protected $table = 'deaths';
    public $timestamps = false;
    
    protected $primaryKey = ' death_id';

    protected $fillable = [
        'department_name',
        ' baptism_id ',
        'date_of_death'
    ];
}
