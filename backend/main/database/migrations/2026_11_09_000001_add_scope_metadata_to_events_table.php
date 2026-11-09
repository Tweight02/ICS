<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('creator_role')->nullable();
            $table->string('scope_type')->nullable();
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->foreignId('district_id')->nullable()->constrained('churches', 'church_id')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments', 'department_id')->nullOnDelete();
            $table->index(['department_id', 'scope_type', 'district_id'], 'events_scope_department_idx');
        });

        DB::table('events')
            ->whereRaw('LOWER(status) = ?', ['cancelled'])
            ->update(['status' => 'CANCELLED']);
        DB::table('events')
            ->whereRaw('LOWER(status) != ?', ['cancelled'])
            ->update(['status' => 'ACTIVE']);

        // The current organization has one mission and no separate missions table; mission scope uses id 1.
        DB::table('events')->orderBy('event_id')->chunkById(100, function ($events): void {
            foreach ($events as $event) {
                $creatorId = DB::table('event_creator')
                    ->where('event_id', $event->event_id)
                    ->value('user_id');
                $creatorRole = $creatorId
                    ? DB::table('users')->where('user_id', $creatorId)->value('role')
                    : null;
                $role = strtolower(trim(str_replace(['-', '_'], ' ', (string) $creatorRole)));
                $church = DB::table('churches')
                    ->where('church_id', $event->church_id)
                    ->first(['church_id', 'parent_id']);
                $districtId = $church?->parent_id
                    ? (int) $church->parent_id
                    : ($church ? (int) $church->church_id : null);
                $departmentId = DB::table('quarters')
                    ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
                    ->where('quarters.quarter_id', $event->quarter_id)
                    ->value('programs.department_id');

                [$scopeType, $scopeId, $scopeDistrictId] = match (true) {
                    in_array($role, ['assistant', 'administrative assistant', 'head assistant'], true) => ['MISSION', 1, null],
                    in_array($role, ['pastor', 'district pastor'], true) => ['DISTRICT', $districtId, $districtId],
                    $role === 'representative' => ['CHURCH', (int) $event->church_id, $districtId],
                    default => [null, null, null],
                };

                DB::table('events')->where('event_id', $event->event_id)->update([
                    'created_by' => $creatorId,
                    'creator_role' => match (true) {
                        in_array($role, ['assistant', 'administrative assistant'], true) => 'ASSISTANT',
                        in_array($role, ['pastor', 'district pastor'], true) => 'DISTRICT_PASTOR',
                        $role === 'representative' => 'CHURCH_REPRESENTATIVE',
                        in_array($role, ['director', 'head director'], true) => 'DIRECTOR',
                        default => null,
                    },
                    'scope_type' => $scopeType,
                    'scope_id' => $scopeId,
                    'district_id' => $scopeDistrictId,
                    'department_id' => $departmentId,
                ]);
            }
        }, 'event_id');
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_scope_department_idx');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['creator_role', 'scope_type', 'scope_id']);
            $table->dropConstrainedForeignId('district_id');
            $table->dropConstrainedForeignId('department_id');
        });
    }
};
