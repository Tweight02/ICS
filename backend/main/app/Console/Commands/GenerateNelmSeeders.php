<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

class GenerateNelmSeeders extends Command
{
    protected $signature = 'nelm:generate-seeders';

    protected $description =
        'Generate ProgramSeeder and ParticularSeeder from existing database records';

    public function handle(): int
    {
        $this->info('Generating NELM seeders...');

        /*
        |--------------------------------------------------------------------------
        | Check database tables
        |--------------------------------------------------------------------------
        */

        if (
            !DB::getSchemaBuilder()->hasTable('programs') ||
            !DB::getSchemaBuilder()->hasTable('particulars')
        ) {
            $this->error(
                'The programs or particulars table does not exist.'
            );

            return self::FAILURE;
        }

        /*
        |--------------------------------------------------------------------------
        | Retrieve programs
        |--------------------------------------------------------------------------
        */

        $programs = DB::table('programs')
            ->select([
                'program_id',
                'department_id',
                'program_name',
                'parent_id',
            ])
            ->orderBy('program_id')
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        /*
        |--------------------------------------------------------------------------
        | Retrieve particulars
        |--------------------------------------------------------------------------
        */

        $particulars = DB::table('particulars')
            ->select([
                'particular_id',
                'program_id',
                'particular_name',
            ])
            ->orderBy('particular_id')
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        /*
        |--------------------------------------------------------------------------
        | Validate source data
        |--------------------------------------------------------------------------
        */

        if (count($programs) === 0) {
            $this->error('No programs were found. No seeders were generated.');

            return self::FAILURE;
        }

        if (count($particulars) === 0) {
            $this->error(
                'No particulars were found. No seeders were generated.'
            );

            return self::FAILURE;
        }

        $programIds = array_map(
            fn ($program) => (int) $program['program_id'],
            $programs
        );

        foreach ($particulars as $particular) {
            if (
                !in_array(
                    (int) $particular['program_id'],
                    $programIds,
                    true
                )
            ) {
                $this->error(
                    "Particular {$particular['particular_id']} references "
                    . "missing program {$particular['program_id']}."
                );

                return self::FAILURE;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Generate ProgramSeeder
        |--------------------------------------------------------------------------
        */

        $programData = var_export($programs, true);

        $programSeeder = <<<'PHP'
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $programs = PROGRAM_DATA;

        foreach ($programs as $program) {
            DB::table('programs')->updateOrInsert(
                [
                    'program_id' => $program['program_id'],
                ],
                [
                    'department_id' => $program['department_id'],
                    'program_name' => $program['program_name'],
                    'parent_id' => $program['parent_id'],
                ]
            );
        }

        $this->command?->info(
            count($programs) . ' programs processed.'
        );
    }
}
PHP;

        $programSeeder = str_replace(
            'PROGRAM_DATA',
            $programData,
            $programSeeder
        );

        /*
        |--------------------------------------------------------------------------
        | Generate ParticularSeeder
        |--------------------------------------------------------------------------
        */

        $particularData = var_export($particulars, true);

        $particularSeeder = <<<'PHP'
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ParticularSeeder extends Seeder
{
    public function run(): void
    {
        $particulars = PARTICULAR_DATA;

        foreach ($particulars as $particular) {
            DB::table('particulars')->updateOrInsert(
                [
                    'particular_id' => $particular['particular_id'],
                ],
                [
                    'program_id' => $particular['program_id'],
                    'particular_name' => $particular['particular_name'],
                ]
            );
        }

        $this->command?->info(
            count($particulars) . ' particulars processed.'
        );
    }
}
PHP;

        $particularSeeder = str_replace(
            'PARTICULAR_DATA',
            $particularData,
            $particularSeeder
        );

        /*
        |--------------------------------------------------------------------------
        | Write generated files
        |--------------------------------------------------------------------------
        */

        $seederDirectory = database_path('seeders');

        File::ensureDirectoryExists($seederDirectory);

        $programPath = $seederDirectory . '/ProgramSeeder.php';
        $particularPath = $seederDirectory . '/ParticularSeeder.php';

        /*
         * Keep the original files safe if writing fails.
         */
        $programBackup = is_file($programPath)
            ? file_get_contents($programPath)
            : null;

        $particularBackup = is_file($particularPath)
            ? file_get_contents($particularPath)
            : null;

        try {
            if (File::put($programPath, $programSeeder) === false) {
                throw new RuntimeException(
                    'Could not write ProgramSeeder.php.'
                );
            }

            if (File::put($particularPath, $particularSeeder) === false) {
                throw new RuntimeException(
                    'Could not write ParticularSeeder.php.'
                );
            }
        } catch (\Throwable $e) {
            if ($programBackup !== null) {
                File::put($programPath, $programBackup);
            } else {
                File::delete($programPath);
            }

            if ($particularBackup !== null) {
                File::put($particularPath, $particularBackup);
            } else {
                File::delete($particularPath);
            }

            $this->error($e->getMessage());

            return self::FAILURE;
        }

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */

        $this->newLine();

        $this->info('Seeders generated successfully.');

        $this->table(
            ['Table', 'Records', 'Generated file'],
            [
                [
                    'programs',
                    count($programs),
                    'ProgramSeeder.php',
                ],
                [
                    'particulars',
                    count($particulars),
                    'ParticularSeeder.php',
                ],
            ]
        );

        $this->warn(
            'Review the generated files before committing them to Git.'
        );

        $this->info(
            'Next, register both seeders in DatabaseSeeder.php.'
        );

        return self::SUCCESS;
    }
}
PHP;