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
        // pt-BR: Só envia se houver um template válido configurado no banco (global ou por organização)
        $templateService = app(\App\Services\EmailTemplateService::class);
        if (!$templateService->getTemplate('contract_approved', $this->contract->organization_id)) {
            return [];
        }

        return [BrevoChannel::class];
    }

    /**
     * Get the Brevo representation of the notification.
     */
    public function toBrevo(object $notifiable): array
    {
        $templateService = app(\App\Services\EmailTemplateService::class);
        $template = $templateService->getTemplate('contract_approved', $this->contract->organization_id);

        // Se chegamos aqui, o template existe (devido à verificação no via()),
        // mas adicionamos uma proteção extra.
        if (!$template) {
            return [];
        }

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

        $subject = $templateService->parse($template->post_title ?? "Seu contrato foi aprovado! - " . $productName, $data);
        $htmlContent = $templateService->parse($template->post_content, $data);
        $textContent = strip_tags($htmlContent);

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
