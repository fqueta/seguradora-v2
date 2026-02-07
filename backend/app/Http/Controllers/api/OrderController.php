<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::query()->with('items');
        // Filtra por organização para usuários autenticados
        if ($request->user()) {
            $user = $request->user();
            if (isset($user->organization_id)) {
                $query->where('organization_id', $user->organization_id);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('fulfillment_type')) {
            $query->where('fulfillment_type', $request->string('fulfillment_type'));
        }
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->string('payment_method'));
        }
        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(function ($q) use ($s) {
                $q->where('customer_name', 'like', "%{$s}%")
                  ->orWhere('customer_phone', 'like', "%{$s}%");
            });
        }
        if ($request->filled('date_start') || $request->filled('date_end')) {
            $start = $request->input('date_start');
            $end = $request->input('date_end');
            if ($start && $end) {
                $query->whereBetween('created_at', [Carbon::parse($start)->startOfDay(), Carbon::parse($end)->endOfDay()]);
            } elseif ($start) {
                $query->where('created_at', '>=', Carbon::parse($start)->startOfDay());
            } elseif ($end) {
                $query->where('created_at', '<=', Carbon::parse($end)->endOfDay());
            }
        }
        $orderBy = $request->get('order_by', 'created_at');
        $order = $request->get('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = (int)($request->get('per_page', 15));
        return $query->paginate($perPage);
    }

    public function show(int $id)
    {
        $order = Order::with(['items.product'])->findOrFail($id);
        return response()->json($order);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);

        $order = Order::create([
            'status' => 'pending',
            'fulfillment_type' => $data['fulfillmentType'],
            'payment_method' => $data['paymentMethod'],
            'mesa_id' => $data['mesaId'] ?? null,
            'customer_name' => $data['customer']['name'],
            'customer_phone' => $data['customer']['phone'],
            'delivery_address' => $data['customer']['address'] ?? null,
            'notes' => $data['notes'] ?? null,
            'token' => Str::uuid()->toString(),
            'config' => [],
            'total_amount' => 0,
            'organization_id' => $request->user()?->organization_id,
        ]);

        foreach ($data['items'] as $item) {
            $productId = (int)$item['productId'];
            $product = Product::find($productId);
            $unitPrice = (float)($item['unitPrice'] ?? ($product?->getAttribute('post_value2') ?? 0));
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $productId,
                'quantity' => (int)$item['quantity'],
                'unit_price' => $unitPrice,
                'total_price' => $unitPrice * (int)$item['quantity'],
                'title' => $item['title'] ?? null,
                'notes' => $item['notes'] ?? null,
                'config' => [
                    'variationGroups' => $item['variationGroups'] ?? []
                ],
            ]);
        }
        $order->refresh();
        $order->calculateTotalAmount();
        $order->load(['items.product']);

        return response()->json($order, 201);
    }

    public function update(Request $request, int $id)
    {
        $order = Order::with('items')->findOrFail($id);
        $payload = $request->all();

        if (isset($payload['items']) && is_array($payload['items'])) {
            foreach ($payload['items'] as $idx => $item) {
                $productId = (int)($item['productId'] ?? 0);
                $exists = Product::query()->where('post_type', 'products')->where('ID', $productId)->exists();
                if (!$exists) {
                    return response()->json([
                        'message' => 'Produto inexistente',
                        'errors' => [ "items.$idx.productId" => ['validation.exists'] ],
                    ], 422);
                }
            }
        }

        $fields = [];
        if (isset($payload['fulfillmentType'])) $fields['fulfillment_type'] = $payload['fulfillmentType'];
        if (isset($payload['paymentMethod'])) $fields['payment_method'] = $payload['paymentMethod'];
        if (array_key_exists('mesaId', $payload)) $fields['mesa_id'] = $payload['mesaId'];
        if (isset($payload['customer'])) {
            $fields['customer_name'] = $payload['customer']['name'] ?? $order->customer_name;
            $fields['customer_phone'] = $payload['customer']['phone'] ?? $order->customer_phone;
            $fields['delivery_address'] = $payload['customer']['address'] ?? $order->delivery_address;
        }
        if (array_key_exists('notes', $payload)) $fields['notes'] = $payload['notes'];

        if (!empty($fields)) {
            $order->update($fields);
        }

        if (isset($payload['items']) && is_array($payload['items'])) {
            $order->items()->delete();
            foreach ($payload['items'] as $item) {
                $productId = (int)$item['productId'];
                $unitPrice = (float)$item['unitPrice'];
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $productId,
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * (int)$item['quantity'],
                    'title' => $item['title'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'config' => [
                        'variationGroups' => $item['variationGroups'] ?? []
                    ],
                ]);
            }
        }

        $order->refresh();
        $order->calculateTotalAmount();
        $order->load(['items.product']);
        return response()->json($order);
    }

    public function updateStatus(Request $request, int $id)
    {
        $order = Order::findOrFail($id);
        $status = $request->string('status');
        $order->update(['status' => $status]);
        return response()->json($order);
    }

    public function destroy(int $id)
    {
        $order = Order::findOrFail($id);
        $order->delete();
        return response()->noContent();
    }

    /**
     * receiptPdf
     * pt-BR: Gera PDF do pedido com suporte a template e controle de impressão.
     * en-US: Generates order PDF supporting template and print control.
     */
    public function receiptPdf(int $id, Request $request)
    {
        $order = Order::with(['items.product','mesa'])->findOrFail($id);

        $template = $request->get('template', 'receipt'); // receipt|kitchen
        $copies = (int)($request->get('copies', 1));
        $adminNotes = $request->string('adminNotes');
        $kitchenNotes = $request->string('kitchenNotes');
        $priority = $request->get('priority', $order->priority ?? 'normal');

        // Atualiza campos de controle de impressão
        $order->update([
            'print_status' => 'printed',
            'print_copies' => max(1, $copies),
            'print_template' => $template,
            'printed_at' => now(),
            'admin_notes' => $adminNotes ?: $order->admin_notes,
            'kitchen_notes' => $kitchenNotes ?: $order->kitchen_notes,
            'priority' => $priority,
        ]);
        $order->refresh();

        $pdf = Pdf::loadView('orders.receipt', [
            'order' => $order,
            'template' => $template,
            'copies' => $copies,
        ])->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
        ]);
        return $pdf->stream("pedido_{$order->id}.pdf");
    }

    protected function validatePayload(Request $request): array
    {
        return $request->validate([
            'fulfillmentType' => 'required|string|in:pickup,delivery',
            'paymentMethod' => 'required|string|in:card,cash,pix',
            'mesaId' => [
                'nullable',
                'integer',
                Rule::exists('posts', 'ID')->where('post_type', 'mesas'),
            ],
            'customer' => 'required|array',
            'customer.name' => 'required|string|max:255',
            'customer.phone' => 'sometimes|string|max:255',
            'customer.address' => 'nullable|array',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.productId' => [
                'required',
                'integer',
                Rule::exists('posts', 'ID')->where('post_type', 'products'),
            ],
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unitPrice' => 'nullable|numeric|min:0',
            'items.*.title' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'items.*.variationGroups' => 'nullable|array',
        ]);
    }
}
