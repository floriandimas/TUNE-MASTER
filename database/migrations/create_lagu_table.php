<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lagu', function (Blueprint $table) {
            $table->id('id_lagu');

            $table->string('video_id')->unique();

            $table->string('judul');
            $table->string('channel_title')->nullable();

            $table->string('path_file');

            $table->float('durasi')->nullable();
            $table->string('format', 20)->default('mp3');

            $table->string('key_asli')->nullable();

            $table->string('nada_terendah')->nullable();
            $table->string('nada_tertinggi')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lagu');
    }
};