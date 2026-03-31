<?php

namespace App\Notifications;

use App\Notifications\Channels\BrevoChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * GenericTemplateNotification
 * pt-BR: Notificação genérica para envio de templates de e-mail personalizados (útil para testes).
 * en-US: Generic notification for sending personalized email templates (useful for testing).
 */
class GenericTemplateNotification extends Notification
{
    use Queueable;

    protected $subject;
    protected $htmlContent;
    protected $attachment;

    public function __construct($subject, $htmlContent, $attachment = [])
    {
        $this->subject = $subject;
        $this->htmlContent = $htmlContent;
        $this->attachment = $attachment;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return [\App\Notifications\Channels\SmtpChannel::class];
    }

    /**
     * Get the Brevo representation of the notification.
     */
    public function toBrevo(object $notifiable): array
    {
        $payload = [
            'subject' => $this->subject,
            'htmlContent' => $this->htmlContent,
            'textContent' => strip_tags($this->htmlContent),
        ];

        if (!empty($this->attachment)) {
            $payload['attachment'] = (array) $this->attachment;
        }

        return $payload;
    }
}
