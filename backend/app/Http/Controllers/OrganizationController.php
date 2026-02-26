<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Organization;

class OrganizationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Organization::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('document', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('active')) {
            $query->where('active', $request->active === 'true' || $request->active === '1');
        }

        $perPage = $request->get('per_page', 15);
        
        return response()->json($query->orderBy('name')->paginate($perPage));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'active' => 'boolean',
            'config' => 'nullable|array',
            'config.cep' => 'required|string',
            'config.numero' => 'required|string',
            'config.endereco' => 'nullable|string',
            'config.complemento' => 'nullable|string',
            'config.bairro' => 'nullable|string',
            'config.cidade' => 'nullable|string',
            'config.uf' => 'nullable|string',
            'config.allowed_products' => 'nullable|array',
            'config.alloyal_business_id' => 'nullable|string',
        ]);

        $organization = Organization::create($validated);

        return response()->json($organization, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $organization = Organization::with('users')->findOrFail($id);
        return response()->json($organization);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $organization = Organization::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'document' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'active' => 'boolean',
            'config' => 'nullable|array',
            'config.cep' => 'required|string',
            'config.numero' => 'required|string',
            'config.endereco' => 'nullable|string',
            'config.complemento' => 'nullable|string',
            'config.bairro' => 'nullable|string',
            'config.cidade' => 'nullable|string',
            'config.uf' => 'nullable|string',
            'config.allowed_products' => 'nullable|array',
            'config.alloyal_business_id' => 'nullable|string',
        ]);

        $organization->update($validated);

        return response()->json($organization);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $organization = Organization::findOrFail($id);
        $organization->delete();

        return response()->json(null, 204);
    }
}
