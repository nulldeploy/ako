<?php
// Receives a request from any form on the site (JSON POST) and emails it.
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';
require __DIR__ . '/mail-template.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Метод не поддерживается']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('AKO mail: api/config.php is missing');
    respond(500, ['ok' => false, 'error' => 'Отправка заявок ещё не настроена']);
}
$config = require $configFile;

$data = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'Некорректный запрос']);
}

$field = static function (string $key, int $maxLength) use ($data): string {
    $value = is_scalar($data[$key] ?? null) ? (string) $data[$key] : '';
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
    return mb_substr($value, 0, $maxLength);
};

// Bots fill every field, people never see this one: pretend success and drop it
if ($field('website', 200) !== '') {
    respond(200, ['ok' => true]);
}

$lead = [
    'name' => $field('name', 100),
    'phone' => $field('phone', 30),
    'service' => $field('service', 150),
    'comment' => $field('comment', 2000),
    'source' => $field('source', 100),
    'page' => $field('page', 300),
    'page_title' => $field('pageTitle', 150),
    'time' => (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))->format('d.m.Y H:i'),
];

if (!preg_match('#^https?://#i', $lead['page'])) {
    $lead['page'] = '';
}
if (mb_strlen($lead['name']) < 2) {
    respond(422, ['ok' => false, 'error' => 'Укажите, как к вам обращаться']);
}
if (strlen((string) preg_replace('/\D/', '', $lead['phone'])) !== 11) {
    respond(422, ['ok' => false, 'error' => 'Укажите телефон полностью']);
}
// 152-ФЗ: consent to process personal data is a separate, explicit tick in the form
if (($data['consent'] ?? null) !== true) {
    respond(422, ['ok' => false, 'error' => 'Подтвердите согласие на обработку персональных данных']);
}

// One request per IP every 15 seconds: stops accidental double clicks and simple flooding
$throttleFile = sys_get_temp_dir() . '/ako-send-' . md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (is_file($throttleFile) && time() - (int) filemtime($throttleFile) < 15) {
    respond(429, ['ok' => false, 'error' => 'Заявка уже отправлена, подождите немного']);
}
touch($throttleFile);

$mail = new PHPMailer(true);
try {
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $smtp = $config['smtp'] ?? [];
    if (!empty($smtp['host'])) {
        $mail->isSMTP();
        $mail->Host = $smtp['host'];
        $mail->Port = (int) ($smtp['port'] ?? 465);
        $mail->SMTPAuth = ($smtp['username'] ?? '') !== '';
        $mail->Username = $smtp['username'] ?? '';
        $mail->Password = $smtp['password'] ?? '';
        $secure = $smtp['secure'] ?? 'ssl';
        if ($secure === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($secure === 'tls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }
    }

    $mail->setFrom($config['from_email'], $config['from_name'] ?? 'Сайт АКО');
    $mail->addAddress($config['to']);
    $mail->Subject = 'Заявка: ' . ($lead['service'] !== '' ? $lead['service'] : 'без услуги') . ' — ' . $lead['name'];
    $mail->isHTML(true);
    $mail->Body = render_lead_html($lead);
    $mail->AltBody = render_lead_text($lead);
    $mail->send();

    respond(200, ['ok' => true]);
} catch (MailException $e) {
    error_log('AKO mail: ' . $mail->ErrorInfo);
    @unlink($throttleFile);
    respond(500, ['ok' => false, 'error' => 'Не удалось отправить заявку']);
}
