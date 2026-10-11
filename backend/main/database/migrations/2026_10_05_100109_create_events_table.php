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
        Schema::create('events', function (Blueprint $table) {
            $table->id('event_id');
            $table->foreignId('quarter_id')
                ->constrained('quarters', 'quarter_id')
                ->cascadeOnDelete();
            $table->foreignId('church_id')
                ->constrained('churches', 'church_id')
                ->cascadeOnDelete();
            $table->string('title');
            $table->date('date_start');
            $table->date('date_end');
            $table->string('details');
            $table->string('status');
            $table->string('location');

            $table->index('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
