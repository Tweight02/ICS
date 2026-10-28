<?php

/*
 * The ONLY place that knows your existing table and column names.
 * Each entry: table name + the columns the events module needs.
 * Adjust every value marked CHECK so it matches your database.
 */
return [
    'tables' => [
        'churches' => ['table' => 'churches', 'id' => 'church_id', 'name' => 'name', 'location' => 'address', 'district_id' => 'parent_id'],

        'districts' => ['table' => 'churches', 'id' => 'church_id', 'name' => 'name', 'parent_id' => 'parent_id'],

        'departments' => ['table' => 'departments', 'id' => 'department_id', 'name' => 'department_name'],
        'programs' => ['table' => 'programs', 'id' => 'program_id', 'name' => 'program_name', 'department_id' => 'department_id'],
        'particulars' => ['table' => 'particulars', 'id' => 'particular_id', 'name' => 'particular_name', 'program_id' => 'program_id'],
    ],

    // Auth middleware used by your other protected routes (see routes/events.php).
    'middleware' => ['auth:sanctum'],
];
