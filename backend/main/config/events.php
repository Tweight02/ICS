<?php

/*
 * The ONLY place that knows your existing table and column names.
 * Each entry: table name + the columns the events module needs.
 * Adjust every value marked CHECK so it matches your database.
 */
return [
    'tables' => [
        // CHECK: churches table (id, name, address, district link)
        'churches' => ['table' => 'churches', 'id' => 'id', 'name' => 'church_name', 'location' => 'address', 'district_id' => 'district_id'],

        // CHECK: districts table. "pastor_id" = column holding the user_id of the district pastor.
        'districts' => ['table' => 'districts', 'id' => 'id', 'name' => 'district_name', 'pastor_id' => 'user_id'],

        // CHECK: departments -> programs (program groups) -> particulars
        'departments' => ['table' => 'departments', 'id' => 'id', 'name' => 'department_name'],
        'programs' => ['table' => 'programs', 'id' => 'id', 'name' => 'program_name', 'department_id' => 'department_id'],
        'particulars' => ['table' => 'particulars', 'id' => 'id', 'name' => 'particular_name', 'program_id' => 'program_id'],
    ],

    // Auth middleware used by your other protected routes (see routes/events.php).
    'middleware' => ['auth:sanctum'],
];
