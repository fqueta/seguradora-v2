<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Recibo #{{ $order->id }}</title>
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; color: #374151; }
        .container { width: 780px; margin: 0 auto; padding: 16px; }
        .header { text-align: center; margin-bottom: 12px; }
        .muted { color: #6B7280; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px; border-bottom: 1px solid #E5E7EB; }
        th { text-align: left; }
        .text-right { text-align: right; }
        .section { margin-top: 12px; }
        .total { font-weight: 700; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ ($template ?? 'receipt') === 'kitchen' ? 'Comanda de Cozinha' : 'Recibo de Pedido' }}</h1>
            <div class="muted">#{{ $order->id }} • {{ $order->token }} • Prioridade: {{ strtoupper($order->priority ?? 'normal') }}</div>
            @if($order->mesa)
                <div class="muted">Mesa: {{ $order->mesa->post_title }}</div>
            @endif
        </div>

        <div class="section">
            <strong>Cliente</strong>
            <div>{{ $order->customer_name }}</div>
            <div class="muted">{{ $order->customer_phone }}</div>
        </div>

        @if(($template ?? 'receipt') !== 'kitchen')
            <div class="section">
                <strong>Atendimento</strong>
                <div>{{ $order->fulfillment_type === 'delivery' ? 'Entrega' : 'Retirada' }}</div>
                <strong>Pagamento</strong>
                <div>
                    @if($order->payment_method === 'card') Cartão
                    @elseif($order->payment_method === 'cash') Dinheiro
                    @else PIX
                    @endif
                </div>
            </div>
        @endif

        @if(($template ?? 'receipt') !== 'kitchen' && $order->fulfillment_type === 'delivery' && is_array($order->delivery_address))
            <div class="section">
                <strong>Endereço de Entrega</strong>
                <div>
                    {{ $order->delivery_address['street'] ?? '' }}
                    {{ $order->delivery_address['number'] ?? '' }}
                    @if(!empty($order->delivery_address['complement'])), {{ $order->delivery_address['complement'] }} @endif
                </div>
                <div>
                    {{ $order->delivery_address['neighborhood'] ?? '' }} -
                    {{ $order->delivery_address['city'] ?? '' }}
                    {{ $order->delivery_address['state'] ?? '' }}
                </div>
                <div>{{ $order->delivery_address['zip'] ?? '' }}</div>
            </div>
        @endif

        <div class="section">
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-right">Qtd.</th>
                        <th class="text-right">Unit.</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($order->items as $it)
                        <tr>
                            <td>
                                <div>{{ $it->title ?? ('#'.$it->product_id) }}</div>
                                @if(!empty($it->variationGroups))
                                    @foreach($it->variationGroups as $group)
                                        <div style="font-size: 10px; margin-left: 8px; color: #6B7280;">
                                            <strong>{{ strtoupper($group['name']) }}:</strong>
                                            @php
                                                $opts = array_map(function($o) { return strtoupper($o['name']); }, $group['options'] ?? []);
                                                echo implode(', ', $opts);
                                            @endphp
                                        </div>
                                    @endforeach
                                @endif
                                @if(!empty($it->notes))
                                    <div style="font-size: 10px; font-style: italic; margin-left: 8px; color: #6B7280; margin-top: 2px;">
                                        * OBS: {{ strtoupper($it->notes) }}
                                    </div>
                                @endif
                            </td>
                            <td class="text-right">{{ $it->quantity }}</td>
                            <td class="text-right">R$ {{ number_format($it->unit_price, 2, ',', '.') }}</td>
                            <td class="text-right">R$ {{ number_format($it->total_price, 2, ',', '.') }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td class="total" colspan="3">Total</td>
                        <td class="text-right total">R$ {{ number_format($order->total_amount, 2, ',', '.') }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        @if(!empty($order->notes))
            <div class="section">
                <strong>Observações</strong>
                <div class="muted">{{ $order->notes }}</div>
            </div>
        @endif
        @if(!empty($order->admin_notes))
            <div class="section">
                <strong>Notas Administrativas</strong>
                <div class="muted">{{ $order->admin_notes }}</div>
            </div>
        @endif
        @if(($template ?? 'receipt') === 'kitchen' && !empty($order->kitchen_notes))
            <div class="section">
                <strong>Notas da Cozinha</strong>
                <div class="muted">{{ $order->kitchen_notes }}</div>
            </div>
        @endif
    </div>
</body>
</html>
