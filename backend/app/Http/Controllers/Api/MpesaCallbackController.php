<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\SaleFinalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Public webhook — Safaricom's servers call this directly, so it is NOT behind
 * auth:sanctum. Only reachable in practice once a real Daraja app is configured
 * with a public HTTPS callback URL (e.g. via ngrok in local dev); unused while
 * MPESA_MOCK=true, since the mock path finalizes the sale inline instead.
 */
class MpesaCallbackController extends Controller
{
    public function __construct(private readonly SaleFinalizer $finalizer) {}

    public function handle(Request $request)
    {
        $callback = $request->input('Body.stkCallback');

        if (! $callback) {
            Log::warning('M-Pesa callback missing stkCallback body', $request->all());

            return $this->accepted();
        }

        $payment = Payment::where('provider_ref', $callback['CheckoutRequestID'] ?? null)->first();

        if (! $payment) {
            Log::warning('M-Pesa callback for unknown CheckoutRequestID', [
                'checkout_request_id' => $callback['CheckoutRequestID'] ?? null,
            ]);

            return $this->accepted();
        }

        if ((int) ($callback['ResultCode'] ?? 1) === 0) {
            $metadata = collect($callback['CallbackMetadata']['Item'] ?? [])
                ->keyBy('Name')
                ->map(fn ($item) => $item['Value'] ?? null);

            $payment->update(['mpesa_receipt' => $metadata->get('MpesaReceiptNumber')]);

            $this->finalizer->complete($payment->sale);
        } else {
            $this->finalizer->fail($payment->sale, $callback['ResultDesc'] ?? 'Payment failed or was cancelled.');
        }

        return $this->accepted();
    }

    /**
     * Safaricom expects this exact 200 shape regardless of outcome, or it retries.
     */
    private function accepted()
    {
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }
}
