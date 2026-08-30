<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HasilPitch extends Model
{
    protected $table = 'hasil_pitch';

    protected $primaryKey = 'id_pitch';

    protected $fillable = [
        'lagu_id',
        'key_hasil',
        'transpose',
        'path_pitch',
    ];

    public function lagu(): BelongsTo
    {
        return $this->belongsTo(
            Lagu::class,
            'lagu_id',
            'id_lagu'
        );
    }

    public function hasilAnalisis(): HasMany
    {
        return $this->hasMany(
            HasilAnalisis::class,
            'hasil_pitch_id',
            'id_pitch'
        );
    }
}