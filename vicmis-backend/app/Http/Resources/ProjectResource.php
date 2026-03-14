<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
 public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'project_name' => $this->project_name,
        'client' => $this->client_name,
        'location' => $this->location,
        'status' => $this->status,
        'engineer' => $this->engineer ? $this->engineer->name : 'Unassigned',
        'progress' => $this->calculateProgress($this->status), // Helper for your 75% bar
        'created_at' => $this->created_at->format('M d, Y'),
    ];
}

private function calculateProgress($status) {
    $stages = [
        'Floor Plan' => 10,
        'Measurement based on Plan' => 25,
        'BOQ based on Plan' => 40,
        'Actual Measurement' => 60,
        'Final BOQ' => 80,
        'Completed' => 100
    ];
    return $stages[$status] ?? 0;
}
}
