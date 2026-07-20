<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class MpesaService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.mpesa.env') === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    public function isMocked(): bool
    {
        return (bool) config('services.mpesa.mock');
    }

    /**
     * Initiate an STK push. Returns ['checkout_request_id' => ..., 'merchant_request_id' => ...].
     *
     * No real Safaricom Daraja credentials are configured in this environment, so
     * when services.mpesa.mock is true this returns a fake reference without making
     * any network call — the caller is responsible for finalizing the sale itself
     * (see SaleController) rather than waiting for a real callback.
     */
    public function stkPush(string $phone, float $amount, string $accountReference, string $description): array
    {
        if ($this->isMocked()) {
            return [
                'checkout_request_id' => 'MOCK-'.Str::uuid(),
                'merchant_request_id' => 'MOCK-'.Str::uuid(),
            ];
        }

        $shortcode = config('services.mpesa.shortcode');
        $passkey = config('services.mpesa.passkey');
        $timestamp = now()->format('YmdHis');
        $password = base64_encode($shortcode.$passkey.$timestamp);

        $response = Http::withToken($this->getAccessToken())
            ->post("{$this->baseUrl}/mpesa/stkpush/v1/processrequest", [
                'BusinessShortCode' => $shortcode,
                'Password' => $password,
                'Timestamp' => $timestamp,
                'TransactionType' => 'CustomerPayBillOnline',
                'Amount' => (int) round($amount),
                'PartyA' => $this->normalizePhone($phone),
                'PartyB' => $shortcode,
                'PhoneNumber' => $this->normalizePhone($phone),
                'CallBackURL' => config('services.mpesa.callback_url'),
                'AccountReference' => $accountReference,
                'TransactionDesc' => $description,
            ]);

        if (! $response->successful() || $response->json('ResponseCode') !== '0') {
            Log::error('M-Pesa STK push failed', ['response' => $response->json()]);

            throw new RuntimeException($response->json('errorMessage', 'M-Pesa STK push failed.'));
        }

        return [
            'checkout_request_id' => $response->json('CheckoutRequestID'),
            'merchant_request_id' => $response->json('MerchantRequestID'),
        ];
    }

    private function getAccessToken(): string
    {
        $response = Http::withBasicAuth(
            config('services.mpesa.consumer_key'),
            config('services.mpesa.consumer_secret'),
        )->get("{$this->baseUrl}/oauth/v1/generate", ['grant_type' => 'client_credentials']);

        if (! $response->successful()) {
            throw new RuntimeException('Unable to authenticate with M-Pesa: '.$response->body());
        }

        return $response->json('access_token');
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone) ?? '';

        if (str_starts_with($phone, '0')) {
            $phone = '254'.substr($phone, 1);
        }

        return $phone;
    }
}
