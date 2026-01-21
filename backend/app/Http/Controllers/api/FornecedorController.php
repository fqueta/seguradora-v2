<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class FornecedorController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;

    public function __construct(PermissionService $permissionService)
    {
        $this->routeName = request()->route() ? request()->route()->getName() : 'fornecedores';
        $this->permissionService = $permissionService;
    }

    protected function sanitizeInput($input)
    {
        if (is_array($input)) {
            $sanitized = [];
            foreach ($input as $key => $value) {
                $sanitized[$key] = $this->sanitizeInput($value);
            }
            return $sanitized;
        } elseif (is_string($input)) {
            return trim(strip_tags($input));
        }
        return $input;
    }

    /**
     * Listar fornecedores (permission_id = 6)
     */
    public function index(Request $request)
    {
        // if (!$this->permissionService->isHasPermission('view')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'name');
        $order = $request->input('order', 'asc');

        $query = User::where('permission_id', 6);

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });

        if ($request->filled('search')) {
            $files = $request->input('search');
            $query->where(function ($q) use ($files) {
                $q->where('name', 'like', '%' . $files . '%')
                  ->orWhere('email', 'like', '%' . $files . '%')
                  ->orWhere('cpf', 'like', '%' . $files . '%')
                  ->orWhere('cnpj', 'like', '%' . $files . '%');
            });
        }

        $query->orderBy($order_by, $order);

        $users = $query->paginate($perPage);

        // Transformar config
        $users->getCollection()->transform(function ($user) {
            if (is_string($user->config)) {
                $user->config = json_decode($user->config, true) ?? [];
            }
            return $user;
        });

        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // if (!$this->permissionService->isHasPermission('create')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        // 1. Limpeza e normalização inicial
        $email = $this->normalizeOptionalString($request->get('email'));
        $cpf = $request->get('cpf') ? preg_replace('/\D/', '', $request->get('cpf')) : null;
        $cnpj = $request->get('cnpj') ? preg_replace('/\D/', '', $request->get('cnpj')) : null;

        // Atualizar o request com os valores limpos
        $request->merge([
            'email' => $email,
            'cpf' => $cpf,
            'cnpj' => $cnpj,
        ]);

        // 2. Verificações de Lixeira (apenas se o campo estiver preenchido)

        // CPF
        if ($cpf) {
            $userCpfDel = User::where('cpf', $cpf)
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($userCpfDel) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['cpf' => ['Cadastro com este CPF está na lixeira']],
                ], 422);
            }
        }

        // Email
        if ($email) {
            $userEmailDel = User::where('email', $email)
                ->where(function($q){
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })->first();
            if ($userEmailDel) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['email' => ['Cadastro com este e-mail está na lixeira']],
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['required', Rule::in(['pf','pj'])],
            'name'          => 'required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => 'nullable|string|max:20|unique:users,cpf',
            'cnpj'          => 'nullable|string|max:20|unique:users,cnpj',
            'email'         => 'nullable|email',
            'password'      => 'nullable|string|min:6',
            'genero'        => ['nullable', Rule::in(['ni','m','f'])],
            'config'        => 'array',
        ]);

        if (!empty($request->email)) {
             $emailValidator = Validator::make($request->all(), [
                'email' => 'unique:users,email'
             ]);
             if ($emailValidator->fails()) {
                 return response()->json([
                    'message' => 'Erro de validação',
                    'errors'  => $emailValidator->errors(),
                ], 422);
             }
        }

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
             return response()->json([
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        $validated = $this->sanitizeInput($validated);

        if (array_key_exists('email', $validated) && ($validated['email'] === '' || $validated['email'] === null)) {
            $validated['email'] = null;
        }
        if (array_key_exists('cpf', $validated)) {
            if ($validated['cpf'] === '' || $validated['cpf'] === null) {
                $validated['cpf'] = null;
            } else {
                $validated['cpf'] = preg_replace('/\D/', '', $validated['cpf']);
            }
        }
        if (array_key_exists('cnpj', $validated) && ($validated['cnpj'] === '' || $validated['cnpj'] === null)) {
            $validated['cnpj'] = null;
        }

        $validated['token'] = Qlib::token();
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $validated['ativo'] = isset($request->ativo) ? $request->ativo : 's';
        $validated['status'] = $validated['ativo'] == 's' ? 'actived' : 'inactived';
        $validated['permission_id'] = 6; // Forcing permission_id = 6 for Fornecedores

        if(isset($validated['config']) && is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }

        $user = User::create($validated);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        // if (!$this->permissionService->isHasPermission('view')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }
        // Ensure we only show fornecedores
        $user = User::where('permission_id', 6)->findOrFail($id);

        if (is_string($user->config)) {
            $user->config = json_decode($user->config, true) ?? [];
        }

        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        // if (!$this->permissionService->isHasPermission('edit')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        // Limpar CPF e CNPJ antes de qualquer verificação
        if ($request->filled('cpf')) {
            $request->merge(['cpf' => preg_replace('/\D/', '', $request->cpf)]);
        }
        if ($request->filled('cnpj')) {
            $request->merge(['cnpj' => preg_replace('/\D/', '', $request->cnpj)]);
        }

        $userToUpdate = User::where('permission_id', 6)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['sometimes', Rule::in(['pf','pj'])],
            'name'          => 'sometimes|required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => ['nullable','string','max:20', Rule::unique('users','cpf')->ignore($userToUpdate->id)],
            'cnpj'          => ['nullable','string','max:20', Rule::unique('users','cnpj')->ignore($userToUpdate->id)],
            'email'         => ['nullable','email'],
            'password'      => 'nullable|string|min:6',
            'genero'        => ['nullable', Rule::in(['ni','m','f'])],
            'ativo'         => ['sometimes', Rule::in(['n','s'])],
            'config'        => 'array'
        ]);

        if (!empty($request->email)) {
             $emailValidator = Validator::make($request->all(), [
                'email' => Rule::unique('users','email')->ignore($userToUpdate->id)
             ]);
             if ($emailValidator->fails()) {
                 return response()->json([
                    'message' => 'Erro de validação',
                    'errors'  => $emailValidator->errors(),
                ], 422);
             }
        }

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        $validated = $this->sanitizeInput($validated);

        if (isset($validated['password'])) {
            if (!empty($validated['password'])) {
                $validated['password'] = Hash::make($validated['password']);
            } else {
                unset($validated['password']);
            }
        }

        if (isset($validated['config']) && is_array($validated['config'])) {
            $validated['config'] = json_encode($validated['config']);
        }

        if (array_key_exists('email', $validated) && ($validated['email'] === '' || $validated['email'] === null)) {
            $validated['email'] = null;
        }
        if (array_key_exists('cpf', $validated)) {
            if ($validated['cpf'] === '' || $validated['cpf'] === null) {
                $validated['cpf'] = null;
            } else {
                $validated['cpf'] = preg_replace('/\D/', '', $validated['cpf']);
            }
        }
        if (array_key_exists('cnpj', $validated) && ($validated['cnpj'] === '' || $validated['cnpj'] === null)) {
            $validated['cnpj'] = null;
        }

        if (isset($request->ativo)) {
            $validated['status'] = $request->ativo == 's' ? 'actived' : 'inactived';
        }

        $userToUpdate->update($validated);

        return response()->json([
            'message' => 'Fornecedor atualizado com sucesso',
            'data' => $userToUpdate
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        // if (!$this->permissionService->isHasPermission('delete')) {
        //     return response()->json(['error' => 'Acesso negado'], 403);
        // }

        $userToDelete = User::where('permission_id', 6)->find($id);

        if (!$userToDelete) {
            return response()->json(['error' => 'Fornecedor não encontrado'], 404);
        }

        $userToDelete->update([
            'excluido'     => 's',
            'deletado'     => 's',
            'reg_deletado' => ['data'=>now()->toDateTimeString(), 'user_id'=>request()->user()->id] ,
        ]);

        return response()->json([
            'message' => 'Fornecedor removido com sucesso'
        ]);
    }
}
