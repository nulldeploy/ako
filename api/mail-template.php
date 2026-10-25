<?php
// Letter about a new request from the site. Table layout + inline styles: email clients
// (Gmail, Outlook, Mail.ru, Yandex) ignore most modern CSS.

function lead_e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function lead_row(string $label, string $valueHtml): string
{
    return '
                <tr>
                  <td style="padding:12px 0;border-top:1px solid #e8edf3;width:140px;vertical-align:top;font:13px/1.5 Arial,Helvetica,sans-serif;color:#64748b;">' . $label . '</td>
                  <td style="padding:12px 0;border-top:1px solid #e8edf3;vertical-align:top;font:15px/1.5 Arial,Helvetica,sans-serif;color:#0f2c59;">' . $valueHtml . '</td>
                </tr>';
}

function render_lead_html(array $lead): string
{
    $phoneHref = 'tel:+' . preg_replace('/\D/', '', $lead['phone']);
    $service = $lead['service'] !== '' ? $lead['service'] : 'Услуга не выбрана';

    $rows = lead_row('Имя', '<strong>' . lead_e($lead['name']) . '</strong>')
        . lead_row('Телефон', '<a href="' . $phoneHref . '" style="color:#0f2c59;font-weight:700;text-decoration:none;">' . lead_e($lead['phone']) . '</a>')
        . lead_row('Услуга', lead_e($service));

    $comment = '';
    if ($lead['comment'] !== '') {
        $comment = '
          <tr>
            <td style="padding:8px 32px 0;">
              <div style="font:600 12px/1 Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Комментарий</div>
              <div style="background:#f4f6f9;border-left:3px solid #0f2c59;border-radius:4px;padding:14px 16px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#1e293b;">'
                . nl2br(lead_e($lead['comment'])) . '</div>
            </td>
          </tr>';
    }

    $meta = lead_row('Форма', lead_e($lead['source'] !== '' ? $lead['source'] : '—'));
    if ($lead['page'] !== '') {
        $meta .= lead_row('Страница', '<a href="' . lead_e($lead['page']) . '" style="color:#2563eb;text-decoration:underline;word-break:break-all;">' . lead_e($lead['page_title'] !== '' ? $lead['page_title'] : $lead['page']) . '</a>');
    }
    $meta .= lead_row('Получена', lead_e($lead['time']) . ' (МСК)');
    $meta .= lead_row('Согласие на ПДн', 'Дано — отмечено клиентом в форме');

    return '<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Новая заявка с сайта</title>
</head>
<body style="margin:0;padding:0;background:#eef2f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f6;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="background:#0f2c59;padding:26px 32px;">
              <div style="font:700 24px/1 Arial,Helvetica,sans-serif;letter-spacing:3px;color:#ffffff;">АКО</div>
              <div style="font:13px/1.4 Arial,Helvetica,sans-serif;color:#aebbd0;margin-top:6px;">Агентство Консалтинга и Оценки</div>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 32px 6px;">
              <div style="font:600 12px/1 Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Новая заявка с сайта</div>
              <div style="font:700 22px/1.3 Arial,Helvetica,sans-serif;color:#0f2c59;margin-top:10px;">' . lead_e($service) . '</div>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $rows . '
              </table>
            </td>
          </tr>
' . $comment . '
          <tr>
            <td style="padding:24px 32px 8px;">
              <a href="' . $phoneHref . '" style="display:inline-block;background:#0f2c59;color:#ffffff;font:700 15px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 24px;border-radius:8px;">Позвонить клиенту</a>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $meta . '
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f4f6f9;padding:18px 32px;font:12px/1.5 Arial,Helvetica,sans-serif;color:#64748b;">
              Письмо отправлено автоматически формой на сайте. Отвечать на него не нужно — свяжитесь с клиентом по телефону.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function render_lead_text(array $lead): string
{
    $lines = [
        'Новая заявка с сайта АКО',
        '',
        'Имя: ' . $lead['name'],
        'Телефон: ' . $lead['phone'],
        'Услуга: ' . ($lead['service'] !== '' ? $lead['service'] : 'не выбрана'),
    ];
    if ($lead['comment'] !== '') {
        $lines[] = '';
        $lines[] = 'Комментарий:';
        $lines[] = $lead['comment'];
    }
    $lines[] = '';
    $lines[] = 'Форма: ' . ($lead['source'] !== '' ? $lead['source'] : '—');
    if ($lead['page'] !== '') {
        $lines[] = 'Страница: ' . $lead['page'];
    }
    $lines[] = 'Получена: ' . $lead['time'] . ' (МСК)';
    $lines[] = 'Согласие на обработку ПДн: дано — отмечено клиентом в форме';

    return implode("\n", $lines);
}
