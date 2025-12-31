<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contract::with(['client', 'owner']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('contract_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $perPage = $request->get('per_page', 15);
        $contracts = $query->latest()->paginate($perPage);

        return response()->json($contracts);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'nullable',
            'owner_id' => 'nullable',
            'contract_number' => 'nullable|string',
            'status' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();
        // HasUuids trait will generate uuid

        $contract = Contract::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Contrato criado com sucesso',
            'data' => $contract
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $contract = Contract::with(['client', 'owner'])->find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        return response()->json($contract);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        $contract->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Contrato atualizado com sucesso',
            'data' => $contract
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        $contract->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contrato removido com sucesso'
        ]);
    }
}
