<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lagu extends Model
{
    protected $table = 'lagu';

    protected $primaryKey = 'id_lagu';

    protected $fillable = [
        'video_id',
        'judul',
        'channel_title',
        'path_file',
        'durasi',
        'format',
        'key_asli',
        'nada_terendah',
        'nada_tertinggi',
    ];

    public function hasilPitch(): HasMany
    {
        return $this->hasMany(
            HasilPitch::class,
            'lagu_id',
            'id_lagu'
        );
    }

    public function hasilAnalisis(): HasMany
    {
        return $this->hasMany(
            HasilAnalisis::class,
            'lagu_id',
            'id_lagu'
        );
    }
}