<?php
// Copy this file to config.php and fill in the mailbox that sends the letters.
// config.php is git-ignored: it holds the SMTP password. Keep real addresses out of this file too:
// the repository is public.
return [
    // Where the requests go
    'to' => 'requests@example.ru',

    // Sender shown in the letter. For Gmail/Yandex/Mail.ru it must be the same mailbox as smtp.username
    'from_email' => 'site@example.ru',
    'from_name' => 'Сайт АКО',

    'smtp' => [
        // Mail.ru: smtp.mail.ru, 465, ssl;  Yandex: smtp.yandex.ru, 465, ssl;  Gmail: smtp.gmail.com, 465, ssl
        // Password = the mailbox's app password (mail settings → security), not the account password
        'host' => 'smtp.mail.ru',
        'port' => 465,
        'secure' => 'ssl', // 'ssl', 'tls' or '' (no encryption)
        'username' => 'site@example.ru',
        'password' => '',
    ],
];
