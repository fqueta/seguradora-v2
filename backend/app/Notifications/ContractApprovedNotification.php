<?php

namespace App\Notifications;

use App\Notifications\Channels\BrevoChannel;
use App\Models\Contract;
use App\Services\Qlib;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Facades\Storage;

class ContractApprovedNotification extends Notification
{
    use Queueable;

    protected $contract;

    /**
     * Create a new notification instance.
     */
    public function __construct(Contract $contract)
    {
        $this->contract = $contract->load(['product', 'client']);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [BrevoChannel::class];
    }

    /**
     * Get the Brevo representation of the notification.
     */
    public function toBrevo(object $notifiable): array
    {
        $templateService = app(\App\Services\EmailTemplateService::class);
        $template = $templateService->getTemplate('contract_approved');

        $productName = $this->contract->product->post_title ?? $this->contract->product->name ?? 'Produto Yellow';
        $startDate = $this->contract->start_date ? $this->contract->start_date->format('d/m/Y') : 'Não informada';
        $endDate = $this->contract->end_date ? $this->contract->end_date->format('d/m/Y') : 'Não informada';
        $contractNumber = $this->contract->contract_number ?? $this->contract->id;
        $contractValue = $this->contract->value ? 'R$ ' . number_format($this->contract->value, 2, ',', '.') : 'Não informado';

        $data = [
            'user_name' => $notifiable->name,
            'client_name' => $notifiable->name,
            'user_email' => $notifiable->email,
            'product_name' => $productName,
            'contract_number' => $contractNumber,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'value' => $contractValue,
            'company_name' => Qlib::get_company_name() ?? 'Clube Yellow',
        ];

        if ($template) {
            $subject = $templateService->parse($template->post_title ?? "Seu contrato foi aprovado! - " . $productName, $data);
            $htmlContent = $templateService->parse($template->post_content, $data);
            $textContent = strip_tags($htmlContent);
        } else {
            // Fallback para conteúdo estático
            $subject = "Seu contrato foi aprovado! - " . $productName;

            $htmlContent = "
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2 style='color: #2563eb;'>Olá, " . e($notifiable->name) . "!</h2>
                    <p>Temos o prazer de informar que seu contrato foi <strong>aprovado</strong> com sucesso.</p>
                    
                    <div style='background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='margin-top: 0;'>Detalhes do seu contrato:</h3>
                        <ul style='list-style: none; padding-left: 0;'>
                            <li><strong>Produto:</strong> " . e($productName) . "</li>
                            <li><strong>Número do Contrato:</strong> " . e($contractNumber) . "</li>
                            <li><strong>Data de Início:</strong> " . e($startDate) . "</li>
                            <li><strong>Vigência até:</strong> " . e($endDate) . "</li>
                        </ul>
                    </div>

                    <p>Você já pode aproveitar todos os benefícios do seu plano.</p>
                    
                    <p>Se tiver qualquer dúvida, nossa equipe está à disposição para ajudar.</p>
                    
                    <p style='margin-top: 30px;'>Atenciosamente,<br><strong>Equipe Clube Yellow</strong></p>
                    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>
                    <p style='font-size: 12px; color: #666;'>Este é um e-mail automático, por favor não responda.</p>
                </div>
            ";

            $textContent = "Olá, " . $notifiable->name . "!\n\n" .
                "Seu contrato foi aprovado com sucesso.\n\n" .
                "Detalhes do seu contrato:\n" .
                "- Produto: " . $productName . "\n" .
                "- Número do Contrato: " . $contractNumber . "\n" .
                "- Data de Início: " . $startDate . "\n" .
                "- Vigência até: " . $endDate . "\n\n" .
                "Você já pode aproveitar todos os benefícios do seu plano.\n\n" .
                "Atenciosamente,\nEquipe Clube Yellow";
        }

        $attachments = [];
        $config = [];

        if ($template) {
            $rawConfig = $template->config;
            $config = is_string($rawConfig) ? (json_decode($rawConfig, true) ?? []) : (is_array($rawConfig) ? $rawConfig : []);
        }

        // 1) Anexo configurado diretamente no template (selecionado da biblioteca de mídia)
        if (!empty($config['attachment']['path']) || !empty($config['attachment']['url'])) {
            $attachPath = $config['attachment']['path'] ?? '';
            $attachUrl = $config['attachment']['url'] ?? '';
            $attachName = $config['attachment']['name'] ?? basename($attachPath ?: $attachUrl);
            
            if ($attachName && !str_ends_with(strtolower($attachName), '.pdf')) {
                $attachName .= '.pdf';
            }

            $attached = false;

            if ($attachPath) {
                if (Storage::disk('public')->exists($attachPath)) {
                    $attachments[] = [
                        'content' => base64_encode(Storage::disk('public')->get($attachPath)),
                        'name' => $attachName,
                    ];
                    $attached = true;
                } elseif (Storage::disk('local')->exists($attachPath)) {
                    $attachments[] = [
                        'content' => base64_encode(Storage::disk('local')->get($attachPath)),
                        'name' => $attachName,
                    ];
                    $attached = true;
                }
            }

            // Fallback: usar URL pública (o Brevo baixa o arquivo)
            if (!$attached && $attachUrl && !str_starts_with($attachUrl, 'blob:')) {
                $absoluteUrl = $attachUrl;
                if (!str_starts_with($attachUrl, 'http')) {
                    $absoluteUrl = url($attachUrl);
                }
                $attachments[] = [
                    'url' => $absoluteUrl,
                    'name' => $attachName,
                ];
            }
        }

        // 2) Anexo do PDF do contrato (se habilitado via switch "Anexar PDF do Contrato")
        $shouldAttachContract = !empty($config['attach_pdf']);
        if ($shouldAttachContract && $this->contract->file_path) {
            $path = $this->contract->file_path;

            if (Storage::disk('public')->exists($path)) {
                $attachments[] = [
                    'content' => base64_encode(Storage::disk('public')->get($path)),
                    'name' => basename($path),
                ];
            } elseif (Storage::disk('local')->exists($path)) {
                $attachments[] = [
                    'content' => base64_encode(Storage::disk('local')->get($path)),
                    'name' => basename($path),
                ];
            }
        }

        return [
            'subject' => $subject,
            'htmlContent' => $htmlContent,
            'textContent' => $textContent,
            'attachment' => !empty($attachments) ? $attachments : null,
        ];
    }
}
