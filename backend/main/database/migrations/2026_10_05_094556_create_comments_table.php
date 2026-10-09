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
        Schema::create('comments', function (Blueprint $table) {
            $table->id('comment_id');

            $table->foreignId('quarter_id')
                ->constrained('quarters', 'quarter_id')
                ->cascadeOnDelete();

            // Which church + department the comment belongs to
            $table->foreignId('church_id')
                ->constrained('churches', 'church_id')          // adjust table/key
                ->cascadeOnDelete();
            $table->foreignId('department_id')
                ->constrained('departments', 'department_id')   // adjust table/key
                ->cascadeOnDelete();

            $table->foreignId('commented_by')
                ->constrained('users', 'user_id')
                ->cascadeOnDelete();

            $table->string('details');
            $table->string('status', 20)->default('commented');
            $table->date('date_commented');

            $table->index(
                ['church_id', 'department_id', 'quarter_id'],
                'idx_comments_scope'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};