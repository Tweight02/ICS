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
            $table->time('time_start');
            $table->time('time_end');
            $table->string('details');
            $table->string('status');
            $table->string('location');

            $table->index('title');
        });

        Schema::create('event_particular', function (Blueprint $table) {
            $table->foreignId('event_id')->constrained('events', 'event_id')->cascadeOnDelete();
            $table->foreignId('particular_id')->constrained('particulars', 'particular_id')->cascadeOnDelete();
            $table->primary(['event_id', 'particular_id']);
        });

        Schema::create('event_district', function (Blueprint $table) {
            $table->foreignId('event_id')->constrained('events', 'event_id')->cascadeOnDelete();
            $table->foreignId('district_id')->constrained('churches', 'church_id')->cascadeOnDelete();
            $table->primary(['event_id', 'district_id']);
        });

        Schema::create('event_creator', function (Blueprint $table) {
            $table->foreignId('event_id')->constrained('events', 'event_id')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->primary('event_id');
        });

        Schema::create('participants', function (Blueprint $table) {
            $table->id('participant_id');
            $table->foreignId('event_id')->constrained('events', 'event_id')->cascadeOnDelete();
            $table->foreignId('church_id')->constrained('churches', 'church_id')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('middle_name');
            $table->string('last_name');
            $table->string('extension_name')->nullable();
            $table->string('age');
            $table->string('gender');
            $table->string('registration_status');
            $table->index('first_name');
            $table->index('middle_name');
            $table->index('last_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('participants');
        Schema::dropIfExists('event_creator');
        Schema::dropIfExists('event_district');
        Schema::dropIfExists('event_particular');
        Schema::dropIfExists('events');
    }
};
