<?php

return [
    'mpesa' => [
        'env' => env('MPESA_ENV', 'sandbox'), // sandbox|production
        'consumer_key' => env('MPESA_CONSUMER_KEY'),
        'consumer_secret' => env('MPESA_CONSUMER_SECRET'),
        'shortcode' => env('MPESA_SHORTCODE'),
        'passkey' => env('MPESA_PASSKEY'),
        'callback_url' => env('MPESA_CALLBACK_URL'),
        // No real Safaricom Daraja credentials are available in this environment.
        // MPESA_MOCK=true short-circuits the STK push and simulates an instant
        // successful callback so the checkout flow can be exercised end-to-end.
        // Set MPESA_MOCK=false (and fill in real credentials + a public callback
        // URL, e.g. via ngrok) to go live against Safaricom.
        'mock' => env('MPESA_MOCK', true),
    ],
];
