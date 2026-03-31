<?php

namespace App\Notifications\Channels;

use App\Models\Option;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Canal de notificação para envio de e-mails via SMTP customizado.
 * Utiliza o mailer 'smtp_custom' configurado em config/mail.php.
 */
class SmtpChannel
{
    /**
     * Envia a notificação utilizando o mailer SMTP customizado.
     *
     * @param mixed $notifiable
     * @param Notification $notification
     * @return bool
     */
    public function send($notifiable, Notification $notification)
    {
        // Tenta obter o payload via toSmtp ou reaproveita o toBrevo (que é o padrão do sistema)
        if (method_exists($notification, 'toSmtp')) {
            $payload = $notification->toSmtp($notifiable);
        } elseif (method_exists($notification, 'toBrevo')) {
            $payload = $notification->toBrevo($notifiable);
        } else {
            Log::warning('SmtpChannel: A notificação não possui os métodos [toSmtp] ou [toBrevo].');
            return false;
        }

        // Obtém o e-mail do destinatário
        $email = method_exists($notifiable, 'routeNotificationForMail')
            ? $notifiable->routeNotificationForMail()
            : ($notifiable->email ?? null);

        if (!$email) {
            Log::warning('SmtpChannel: Destinatário sem endereço de e-mail definido.', ['id' => $notifiable->id ?? 'unknown']);
            return false;
        }

        $subject = $payload['subject'] ?? 'Notificação do Sistema';
        $htmlContent = $payload['htmlContent'] ?? '';
        
        // Aplica a moldura visual (wrapper) para manter a consistência com o BrevoChannel
        $htmlContent = $this->getHtmlWrapper($htmlContent, $subject);

        try {
            Mail::mailer('smtp_custom')->send([], [], function ($message) use ($email, $subject, $htmlContent, $payload, $notifiable) {
                $message->to((string)$email, (string)($notifiable->name ?? ''))
                    ->subject($subject)
                    ->html($htmlContent);
                
                // Remetente corrigido para máxima compatibilidade com SPF/MX
                $fromEmail = $payload['sender']['email'] ?? env('SMTP_CUSTOM_FROM_ADDRESS');
                $fromName = $payload['sender']['name'] ?? env('SMTP_CUSTOM_FROM_NAME');
                
                if ($fromEmail) {
                    $message->from($fromEmail, $fromName);
                    Log::debug('SmtpChannel: Remetente configurado', ['email' => $fromEmail, 'name' => $fromName]);
                }

                // Processa anexos
                if (!empty($payload['attachment'])) {
                    foreach ($payload['attachment'] as $attach) {
                        if (isset($attach['content'])) {
                            // Conteúdo base64
                            $message->attachData(
                                base64_decode((string)$attach['content']), 
                                (string)$attach['name'],
                                ['mime' => 'application/pdf']
                            );
                        } elseif (isset($attach['url'])) {
                            // URL pública - SMTP precisa baixar o conteúdo primeiro
                            try {
                                $content = file_get_contents($attach['url']);
                                if ($content !== false) {
                                    $message->attachData($content, (string)$attach['name']);
                                }
                            } catch (\Exception $e) {
                                Log::error('SmtpChannel: Falha ao baixar anexo da URL', [
                                    'url' => $attach['url'],
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }
                    }
                }
            });

            Log::info('SmtpChannel: E-mail enviado com sucesso via SMTP customizado', [
                'to' => $email,
                'subject' => $subject
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('SmtpChannel: Erro crítico no envio SMTP customizado', [
                'error' => $e->getMessage(),
                'to' => $email,
                'subject' => $subject
            ]);
            return false;
        }
    }

    /**
     * Envolve o conteúdo do e-mail em uma moldura HTML profissional e responsiva.
     */
    private function getHtmlWrapper($content, $subject)
    {
        // Buscar configurações dinâmicas do sistema para manter identidade visual
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
