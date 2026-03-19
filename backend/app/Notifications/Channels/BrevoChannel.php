<?php

namespace App\Notifications\Channels;

use App\Models\Option;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Canal de notificação para envio de e-mails via API Brevo (Sendinblue).
 *
 * Este canal utiliza as credenciais definidas em config('services.brevo') e
 * envia e-mails pelo endpoint HTTP `/smtp/email`.
 */
class BrevoChannel
{
    /**
     * Envia a notificação utilizando a API do Brevo.
     *
     * @param mixed $notifiable Entidade que será notificada
     * @param Notification $notification Notificação com conteúdo
     * @return array|null Resposta simplificada da API ou null em caso de falha
     */
    public function send($notifiable, Notification $notification)
    {
        $config = config('services.brevo');
        $apiKey = (string) ($config['api_key'] ?? '');
        $apiUrl = rtrim((string) ($config['api_url'] ?? 'https://api.brevo.com/v3'), '/');

        if ($apiKey === '') {
            // Logar ausência de configuração para facilitar diagnóstico
            Log::warning('BrevoChannel: API key ausente, envio ignorado.');
            return null;
        }

        // O método toBrevo deve retornar o payload sem credenciais
        if (!method_exists($notification, 'toBrevo')) {
            return null;
        }

        $payload = (array) $notification->toBrevo($notifiable);

        // Envolver conteúdo HTML em uma moldura (wrapper) profissional
        if (isset($payload['htmlContent'])) {
            $payload['htmlContent'] = $this->getHtmlWrapper($payload['htmlContent'], $payload['subject'] ?? '');
        }

        // Garantir remetente padrão a partir das configs
        $fromEmail = (string) ($config['from_email'] ?? '');
        $fromName = (string) ($config['from_name'] ?? '');
        $payload['sender'] = $payload['sender'] ?? [
            'email' => $fromEmail,
            'name' => $fromName,
        ];

        // Garantir destinatário principal
        $email = method_exists($notifiable, 'routeNotificationForMail')
            ? $notifiable->routeNotificationForMail()
            : ($notifiable->email ?? null);

        if (!isset($payload['to'])) {
            $payload['to'] = [];
        }
        if ($email) {
            $payload['to'][] = ['email' => (string) $email, 'name' => (string) ($notifiable->name ?? '')];
        }

        // Remover campos nulos ou arrays vazios do payload para evitar erros na API
        foreach (['attachment', 'textContent', 'cc', 'bcc', 'replyTo'] as $optionalField) {
            if (array_key_exists($optionalField, $payload)) {
                if (is_null($payload[$optionalField]) || (is_array($payload[$optionalField]) && empty($payload[$optionalField]))) {
                    unset($payload[$optionalField]);
                }
            }
        }

        // Pré-visualização para auditoria (sem conteúdo sensível como API key)
        Log::info('BrevoChannel: preparando envio', [
            'to' => collect($payload['to'])->map(fn($t) => $t['email'])->all(),
            'subject' => $payload['subject'] ?? null,
            'has_attachment' => isset($payload['attachment']) ? count($payload['attachment']) : 0,
            'attachment_keys' => isset($payload['attachment']) ? collect($payload['attachment'])->map(fn($a) => array_keys($a))->all() : [],
            'attachment_names' => isset($payload['attachment']) ? collect($payload['attachment'])->pluck('name')->all() : [],
            'html_preview' => isset($payload['htmlContent']) ? Str::limit(strip_tags((string) $payload['htmlContent']), 180) : null,
        ]);

        // Chamada HTTP para Brevo
        $response = Http::withHeaders([
                'api-key' => $apiKey,
                'accept' => 'application/json',
                'content-type' => 'application/json',
            ])
            ->post($apiUrl . '/smtp/email', $payload);

        // Retornar resposta simplificada
        if ($response->successful()) {
            $result = [
                'status' => $response->status(),
                'messageId' => data_get($response->json(), 'messageId'),
            ];
            Log::info('BrevoChannel: envio concluído com sucesso', [
                'status' => $result['status'],
                'messageId' => $result['messageId'] ?? null,
                'to' => collect($payload['to'])->map(fn($t) => $t['email'])->all(),
                'subject' => $payload['subject'] ?? null,
            ]);
            return $result;
        }

        $error = [
            'status' => $response->status(),
            'error' => $response->json(),
        ];
        Log::error('BrevoChannel: falha no envio', [
            'status' => $error['status'],
            'error' => $error['error'],
            'to' => collect($payload['to'])->map(fn($t) => $t['email'])->all(),
            'subject' => $payload['subject'] ?? null,
        ]);
        return $error;
    }

    /**
     * Envolve o conteúdo do e-mail em uma moldura HTML profissional e responsiva.
     */
    private function getHtmlWrapper($content, $subject)
    {
        // Buscar configurações dinâmicas do sistema
        $primaryColor = Option::where('url', 'ui_primary_color')->value('value') ?: '#952c9f';
        $institutionName = Option::where('url', 'app_institution_name')->value('value') ?: config('app.name');
        $logoUrl = Option::where('url', 'app_logo_url')->value('value');

        $headerLogo = $logoUrl 
            ? "<img src=\"{$logoUrl}\" alt=\"{$institutionName}\" style=\"max-height: 50px; width: auto; display: block; margin: 0 auto;\">"
            : "<h1 style=\"margin:0; font-size: 24px; color: #111827; font-weight: 800; letter-spacing: -0.5px;\">{$institutionName}</h1>";

        return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$subject}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #334155; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 4px solid {$primaryColor}; }
        .content { padding: 40px 30px; line-height: 1.7; font-size: 16px; color: #1e293b; }
        .footer { padding: 30px 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        .content p { margin-bottom: 1.2em; }
        .content h1, .content h2, .content h3 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; }
        a { color: {$primaryColor}; text-decoration: none; font-weight: 600; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
        a:hover { border-bottom-color: {$primaryColor}; }
        .divider { height: 1px; background-color: #e2e8f0; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
                <td class="header">
                    {$headerLogo}
                </td>
            </tr>
            <tr>
                <td class="content">
                    {$content}
                </td>
            </tr>
        </table>
        <table style="margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0;" role="presentation">
            <tr>
                <td class="footer">
                    <p style="margin: 0 0 8px; font-weight: 600;">&copy; {$institutionName}</p>
                    <p style="margin: 0 0 15px">Este é um e-mail automático enviado pelo sistema de gestão.</p>
                    <div style="height: 1px; background-color: #e2e8f0; margin: 15px auto; width: 40px;"></div>
                    <p style="margin: 0; font-size: 11px; opacity: 0.7;">Você recebeu este e-mail porque seu endereço está vinculado a uma conta ou contrato no Clube Yellow.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
HTML;
    }
}