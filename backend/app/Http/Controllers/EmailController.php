<?php

namespace App\Http\Controllers;

use App\Models\NotificationRecipient;
use App\Notifications\WelcomeEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Log;
use App\Notifications\GenericTemplateNotification;
use App\Services\EmailTemplateService;

/**
 * EmailController
 * pt-BR: Controlador para endpoints de envio de e-mails.
 * en-US: Controller for email sending endpoints.
 */
class EmailController extends Controller
{
    /**
     * sendWelcome
     * pt-BR: Envia e-mail de boas-vindas utilizando o canal Brevo.
     * en-US: Sends welcome email using Brevo channel.
     */
    public function sendWelcome(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'name' => ['required', 'string', 'min:2'],
            'course_title' => ['nullable', 'string'],
            'course_id' => ['nullable'],
        ]);

        $recipient = new NotificationRecipient($validated['email'], $validated['name']);
        $courseTitle = $validated['course_title'] ?? 'seu curso';
        $courseId = $validated['course_id'] ?? null;

        try {
            $result = Notification::send($recipient, new WelcomeEmailNotification($validated['name'], $courseTitle, $courseId));
            // O canal Brevo retorna array simplificado; expor status amigável
            Log::info('EmailController: Welcome email dispatched', ['email' => $validated['email'], 'course_title' => $courseTitle]);
            return response()->json([
                'success' => true,
                'message' => 'Welcome email sent',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('EmailController: Welcome email failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to send welcome email',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    /**
     * getShortcodes
     * pt-BR: Retorna a lista de shortcodes disponíveis para templates de e-mail.
     * en-US: Returns the list of available shortcodes for email templates.
     */
    public function getShortcodes(Request $request, string $context = 'contract')
    {
        $service = app(\App\Services\EmailTemplateService::class);
        $shortcodes = $service->getAvailableShortcodes($context);

        return response()->json([
            'success' => true,
            'data' => $shortcodes,
        ]);
    }

    /**
     * sendTest
     * pt-BR: Envia um e-mail de teste com o conteúdo do template fornecido.
     * en-US: Sends a test email with the provided template content.
     */
    public function sendTest(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'post_title' => ['required', 'string'],
            'post_content' => ['required', 'string'],
            'context' => ['nullable', 'string'],
            'config' => ['nullable', 'array'],
        ]);

        $service = app(EmailTemplateService::class);
        
        // Dados de teste para preencher shortcodes
        $testData = [
            'client_name' => 'Usuário Teste (Yellow)',
            'client_email' => $validated['email'],
            'contract_number' => 'TEST-0001-2023',
            'product_name' => 'Plano de Saúde Teste',
            'start_date' => now()->format('d/m/Y'),
            'end_date' => now()->addYear()->format('d/m/Y'),
            'periodicity' => 'Mensal',
            'value' => 'R$ 299,90',
            'user_name' => auth()->user()->name ?? 'Administrador',
            'company_name' => 'Clube Yellow',
        ];

        // Processar shortcodes no título e no conteúdo
        $parsedTitle = $service->parse($validated['post_title'], $testData);
        $parsedContent = $service->parse($validated['post_content'], $testData);

        // Montar anexos a partir do config do template
        $attachments = [];
        $config = $validated['config'] ?? [];

        if (!empty($config['attachment']['path']) || !empty($config['attachment']['url'])) {
            $attachPath = $config['attachment']['path'] ?? '';
            $attachUrl = $config['attachment']['url'] ?? '';
            $attachName = $config['attachment']['name'] ?? basename($attachPath ?: $attachUrl);
            
            // Garante extensão .pdf no nome
            if ($attachName && !str_ends_with(strtolower($attachName), '.pdf')) {
                $attachName .= '.pdf';
            }

            Log::info('EmailController: Tentando anexar arquivo', [
                'path' => $attachPath,
                'url' => $attachUrl,
                'name' => $attachName,
                'public_exists' => $attachPath ? \Storage::disk('public')->exists($attachPath) : false,
                'local_exists' => $attachPath ? \Storage::disk('local')->exists($attachPath) : false,
            ]);

            $attached = false;

            // Tentar via Storage (conteúdo em base64)
            if ($attachPath) {
                if (\Storage::disk('public')->exists($attachPath)) {
                    $attachments[] = [
                        'content' => base64_encode(\Storage::disk('public')->get($attachPath)),
                        'name' => $attachName,
                    ];
                    $attached = true;
                } elseif (\Storage::disk('local')->exists($attachPath)) {
                    $attachments[] = [
                        'content' => base64_encode(\Storage::disk('local')->get($attachPath)),
                        'name' => $attachName,
                    ];
                    $attached = true;
                }
            }

            // Fallback: se tem URL pública, usar o campo "url" do Brevo (o Brevo baixa o arquivo)
            if (!$attached && $attachUrl && !str_starts_with($attachUrl, 'blob:')) {
                // Montar URL absoluta se for relativa
                $absoluteUrl = $attachUrl;
                if (!str_starts_with($attachUrl, 'http')) {
                    $absoluteUrl = url($attachUrl);
                }
                $attachments[] = [
                    'url' => $absoluteUrl,
                    'name' => $attachName,
                ];
                $attached = true;
            }

            Log::info('EmailController: Resultado do anexo', [
                'attached' => $attached,
                'attachments_count' => count($attachments),
                'config_attachment' => $config['attachment'] ?? 'not_provided'
            ]);
        }

        // Criar destinatário temporário
        $recipient = new \App\Models\NotificationRecipient($validated['email'], $testData['client_name']);

        try {
            Notification::send($recipient, new GenericTemplateNotification(
                $parsedTitle,
                $parsedContent,
                !empty($attachments) ? $attachments : []
            ));
            
            return response()->json([
                'success' => true,
                'message' => 'E-mail de teste enviado com sucesso para ' . $validated['email'],
            ]);
        } catch (\Throwable $e) {
            Log::error('EmailController: Test email failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Falha ao enviar e-mail de teste',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}