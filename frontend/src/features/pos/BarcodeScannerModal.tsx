import { useEffect, useRef, useState } from 'react'
import Quagga from '@ericblade/quagga2'
import { useAppDispatch } from '@/app/hooks'
import { useLazyLookupBarcodeQuery } from '@/features/products/productsApi'
import { addItem } from './cartSlice'

export default function BarcodeScannerModal({
  onClose,
  onDetected,
}: {
  onClose: () => void
  onDetected: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const [lookupBarcode] = useLazyLookupBarcodeQuery()

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    let settled = false

    // Some environments (this includes sandboxed/headless browsers) block
    // getUserMedia without ever rejecting the underlying promise, so Quagga's
    // init callback never fires either way. Without this, the modal would
    // spin forever with no way out other than closing it manually.
    const cameraTimeout = window.setTimeout(() => {
      if (cancelled || settled) return
      settled = true
      setCameraError('Could not access the camera (timed out). Search by name, SKU or barcode instead.')
    }, 6000)

    const handleDetected = async (result: { codeResult: { code: string | null } }) => {
      const code = result.codeResult.code
      if (!code || busyRef.current) return
      busyRef.current = true

      try {
        const product = await lookupBarcode(code).unwrap()
        dispatch(addItem(product))
        onDetected()
      } catch {
        setNotFound(code)
        busyRef.current = false
      }
    }

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: containerRef.current,
          constraints: { facingMode: 'environment' },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader'],
        },
        locate: true,
      },
      (err) => {
        if (cancelled || settled) return
        settled = true
        window.clearTimeout(cameraTimeout)

        if (err) {
          // No camera device, permission denied, or an insecure (non-HTTPS)
          // context — Quagga can't do anything without getUserMedia. Fall back
          // to manual entry via the regular search box instead of crashing.
          setCameraError('Could not access the camera. Search by name, SKU or barcode instead.')
          return
        }

        Quagga.start()
        Quagga.onDetected(handleDetected)
      },
    )

    return () => {
      cancelled = true
      window.clearTimeout(cameraTimeout)
      Quagga.offDetected(handleDetected)
      Quagga.stop()
    }
  }, [dispatch, lookupBarcode, onDetected])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Scan Barcode</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            &times;
          </button>
        </div>

        {cameraError ? (
          <p className="text-sm text-red-600">{cameraError}</p>
        ) : (
          <div ref={containerRef} className="relative rounded overflow-hidden bg-black" style={{ minHeight: 240 }} />
        )}

        {notFound && (
          <p className="text-sm text-amber-600">
            No active product matches barcode {notFound}. Still scanning...
          </p>
        )}

        <button onClick={onClose} className="w-full px-4 py-2 text-sm rounded border border-gray-300">
          Close
        </button>
      </div>
    </div>
  )
}
