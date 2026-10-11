<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('quarters', function (Blueprint $table) {
            $table->id('quarter_id');
            $table->foreignId('program_id')
                ->constrained('programs', 'program_id')
                ->cascadeOnDelete();
            $table->foreignId('church_id')
                ->constrained('churches', 'church_id')
                ->cascadeOnDelete();
            $table->string('quarter');
            $table->string('year');
            $table->date('date_submitted')->nullable();
            $table->date('district_endorse')->nullable();
            $table->date('mission_approve')->nullable();

            $table->index('quarter');
            $table->index('year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quarters');
    }
};
