<?php
// Copy this file to config.php and fill in the mailbox that sends the letters.
// config.php is git-ignored: it holds the SMTP password.
return [
    // Where the requests go
    'to' => 'leps.ermak10@gmail.com',

    // Sender shown in the letter. For Gmail/Yandex/Mail.ru it must be the same mailbox as smtp.username
    'from_email' => 'leps.ermak10@gmail.com',
    'from_name' => 'Сайт АКО',

    'smtp' => [
        // Gmail: smtp.gmail.com, 465, ssl (password = app password, not the account password)
        // Yandex: smtp.yandex.ru, 465, ssl;  Mail.ru: smtp.mail.ru, 465, ssl
        'host' => 'smtp.gmail.com',
        'port' => 465,
        'secure' => 'ssl', // 'ssl', 'tls' or '' (no encryption)
        'username' => 'leps.ermak10@gmail.com',
        'password' => '',
    ],
];
