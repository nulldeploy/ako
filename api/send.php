<?php
// Receives a request from any form on the site (JSON POST) and emails it.
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';
require __DIR__ . '/mail-template.php';

// Never show PHP warnings to visitors (they reveal server paths); they still go to the error log
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// Counter that resets after $window seconds; returns the count including this request
function bump_counter(string $name, int $window): int
{
    $handle = fopen(sys_get_temp_dir() . '/ako-count-' . $name, 'c+');
    if ($handle === false) {
        return 0;
    }
    flock($handle, LOCK_EX);
    $state = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($state) || ($state['start'] ?? 0) + $window < time()) {
        $state = ['start' => time(), 'count' => 0];
    }
    $state['count']++;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($state));
    flock($handle, LOCK_UN);
    fclose($handle);
    return $state['count'];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Метод не поддерживается']);
}

// Forms on this site only: a page on another site can't submit requests in a visitor's name
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$ownHost = parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $ownHost) {
    respond(403, ['ok' => false, 'error' => 'Запрос отклонён']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('AKO mail: api/config.php is missing');
    respond(500, ['ok' => false, 'error' => 'Отправка заявок ещё не настроена']);
}
$config = require $configFile;

// A real request is well under 10 KB; read a little more than that and refuse anything bigger
$raw = (string) file_get_contents('php://input', false, null, 0, 20001);
if (strlen($raw) > 20000) {
    respond(413, ['ok' => false, 'error' => 'Слишком большой запрос']);
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'Некорректный запрос']);
}

// Only the comment may span several lines; everything else is one line (it also goes into the subject)
$field = static function (string $key, int $maxLength, bool $multiline = false) use ($data): string {
    $value = is_scalar($data[$key] ?? null) ? (string) $data[$key] : '';
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    if (!$multiline) {
        $value = preg_replace('/[\r\n\t]+/', ' ', $value) ?? '';
    }
    return mb_substr(trim($value), 0, $maxLength);
};

// Bots fill every field, people never see this one: pretend success and drop it
if ($field('website', 200) !== '') {
    respond(200, ['ok' => true]);
}

$lead = [
    'name' => $field('name', 100),
    'phone' => $field('phone', 30),
    'service' => $field('service', 150),
    'comment' => $field('comment', 2000, true),
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
$ipKey = md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$throttleFile = sys_get_temp_dir() . '/ako-send-' . $ipKey;
if (is_file($throttleFile) && time() - (int) filemtime($throttleFile) < 15) {
    respond(429, ['ok' => false, 'error' => 'Заявка уже отправлена, подождите немного']);
}
touch($throttleFile);

// Caps against a bot that gets past the hidden field: per address per day, and for the whole site per hour
if (bump_counter('ip-' . $ipKey, 86400) > 20) {
    respond(429, ['ok' => false, 'error' => 'Слишком много заявок. Позвоните нам: +7 (812) 986-28-15']);
}
if (bump_counter('all', 3600) > 60) {
    error_log('AKO mail: more than 60 requests in an hour, sending paused');
    respond(429, ['ok' => false, 'error' => 'Сейчас не получается принять заявку. Позвоните нам: +7 (812) 986-28-15']);
}

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
