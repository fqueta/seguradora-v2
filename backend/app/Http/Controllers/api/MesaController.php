<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Mesa;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MesaController extends Controller
{
    protected PermissionService $permissionService;
    protected string $post_type = 'mesas';

    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    private function sanitizeInput($data)
    {
        if (is_array($data)) {
            $sanitized = [];
            foreach ($data as $key => $value) {
                $sanitized[$key] = $this->sanitizeInput($value);
            }
            return $sanitized;
        }
        if (is_string($data)) {
            $clean = strip_tags($data);
            $clean = trim($clean, " \t\n\r\0\x0B`\"'");
            return $clean;
        }
        return $data;
    }

    private function getStatus(bool $active)
    {
        return $active ? 'publish' : 'draft';
    }

    private function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'capacity' => 'nullable|integer|min:1|max:20',
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Mesa::query()->orderBy($order_by, $order);
        // Filtra por organização para usuários com permission_id >= 3
        if (isset($user->permission_id) && intval($user->permission_id) >= 3) {
            $query->where('organization_id', $user->organization_id);
        }
        if ($request->filled('name')) {
            $query->where('post_title', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->filled('active')) {
            $status = $this->getStatus($request->boolean('active'));
            $query->where('post_status', $status);
        }
        $mesas = $query->paginate($perPage);
        $mesas->getCollection()->transform(function ($item) {
            return $this->mapMesa($item);
        });
        return response()->json($mesas);
    }

    private function mapMesa($mesa)
    {
        return [
            'id' => $mesa->ID,
            'name' => $mesa->post_title,
            'description' => $mesa->post_content,
            'slug' => $mesa->post_name,
            'token' => $mesa->token,
            'active' => $mesa->post_status === 'publish',
            'capacity' => $mesa->config['capacity'] ?? null,
            'created_at' => $mesa->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $mesa->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $validator = Validator::make($request->all(), $this->rules());
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        // Impede duplicidade na lixeira
        $existing = Mesa::withoutGlobalScope('notDeleted')
            ->where('post_title', $validated['name'])
            ->where(function($q){
                $q->where('excluido', 's')->orWhere('deletado', 's');
            })->first();
        if ($existing) {
            return response()->json([
                'message' => 'Já existe uma mesa com este nome na lixeira. Restaure-a ou use outro nome.',
                'error' => 'duplicate_name'
            ], 409);
        }

        // Mapeia campos
        $mapped = [
            'post_title' => $validated['name'],
            'post_content' => $validated['description'] ?? '',
            'post_status' => $this->getStatus($validated['active'] ?? true),
        ];
        $config = [];
        if (isset($validated['capacity'])) {
            $config['capacity'] = (int)$validated['capacity'];
        }
        if (!empty($config)) {
            $mapped['config'] = $config;
        }
        $mapped['post_name'] = (new Mesa())->generateSlug($validated['name']);
        $mapped = $this->sanitizeInput($mapped);
        $mapped['token'] = Qlib::token();
        $mapped['post_author'] = $user->id;
        $mapped['comment_status'] = 'closed';
        $mapped['ping_status'] = 'closed';
        $mapped['post_type'] = $this->post_type;
        $mapped['menu_order'] = 0;
        $mapped['to_ping'] = 's';
        $mapped['organization_id'] = $user->organization_id;
        $mapped['excluido'] = 'n';
        $mapped['deletado'] = 'n';

        $mesa = Mesa::create($mapped);
        $response = $this->mapMesa($mesa);
        return response()->json([
            'data' => $response,
            'message' => 'Mesa criada com sucesso',
            'status' => 201,
        ], 201);
    }

    public function show(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $mesa = Mesa::findOrFail($id);
        return response()->json([
            'data' => $this->mapMesa($mesa),
            'message' => 'Mesa encontrada com sucesso',
            'status' => 200,
        ]);
    }

    public function getByToken(string $token)
    {
        $mesa = Mesa::where('token', $token)->first();
        if (!$mesa) {
            return response()->json([
                'message' => 'Mesa não encontrada',
                'status' => 404,
            ], 404);
        }
        return response()->json([
            'data' => $this->mapMesa($mesa),
            'message' => 'Mesa encontrada com sucesso',
            'status' => 200,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'capacity' => 'nullable|integer|min:1|max:20',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();
        $mesa = Mesa::findOrFail($id);

        $mapped = [];
        if (isset($validated['name'])) {
            $mapped['post_title'] = $validated['name'];
            $mapped['post_name'] = $mesa->generateSlug($validated['name']);
        }
        if (isset($validated['description'])) {
            $mapped['post_content'] = $validated['description'];
        }
        if (isset($validated['active'])) {
            $mapped['post_status'] = $this->getStatus($validated['active']);
        }
        $config = $mesa->config ?? [];
        if (isset($validated['capacity'])) {
            $config['capacity'] = (int)$validated['capacity'];
        }
        if (!empty($config)) {
            $mapped['config'] = $config;
        }
        $mapped = $this->sanitizeInput($mapped);
        $mapped['post_type'] = $this->post_type;

        $mesa->update($mapped);
        return response()->json([
            'exec' => true,
            'data' => $this->mapMesa($mesa),
            'message' => 'Mesa atualizada com sucesso',
            'status' => 200,
        ]);
    }

    public function destroy(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $mesa = Mesa::find($id);
        if (!$mesa) {
            return response()->json([
                'message' => 'Mesa não encontrada',
                'status' => 404,
            ], 404);
        }
        $mesa->update([
            'excluido' => 's',
            'reg_excluido' => json_encode([
                'excluido_por' => $user->id,
                'excluido_em' => now()->toDateTimeString(),
            ])
        ]);
        return response()->json([
            'exec' => true,
            'message' => 'Mesa excluída com sucesso',
            'status' => 200,
        ]);
    }

    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'updated_at');
        $order = $request->input('order', 'desc');
        $query = Mesa::withoutGlobalScope('notDeleted')
            ->where(function($q){
                $q->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->orderBy($order_by, $order);
        if (isset($user->permission_id) && intval($user->permission_id) >= 3) {
            $query->where('organization_id', $user->organization_id);
        }
        $mesas = $query->paginate($perPage);
        $mesas->getCollection()->transform(fn($m) => $this->mapMesa($m));
        return response()->json($mesas);
    }

    public function restore(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $mesa = Mesa::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){
                $q->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();
        if (!$mesa) {
            return response()->json([
                'message' => 'Mesa não encontrada na lixeira',
                'status' => 404,
            ], 404);
        }
        $mesa->update([
            'excluido' => 'n',
            'deletado' => 'n',
            'reg_excluido' => null,
            'reg_deletado' => null,
        ]);
        return response()->json([
            'exec' => true,
            'message' => 'Mesa restaurada com sucesso',
            'status' => 200,
        ]);
    }

    public function forceDelete(string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $mesa = Mesa::withoutGlobalScope('notDeleted')
            ->where('ID', $id)
            ->where(function($q){
                $q->where('excluido', 's')->orWhere('deletado', 's');
            })
            ->first();
        if (!$mesa) {
            return response()->json([
                'message' => 'Mesa não encontrada na lixeira',
                'status' => 404,
            ], 404);
        }
        $mesa->forceDelete();
        return response()->json([
            'exec' => true,
            'message' => 'Mesa excluída permanentemente',
            'status' => 200,
        ]);
    }
}
