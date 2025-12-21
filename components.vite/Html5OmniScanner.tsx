import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface Html5OmniScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
  /** Optional: restrict to formats; default supports common QR + barcodes */
  formats?: Html5QrcodeSupportedFormats[];
  /** Optional: QR box size or function to compute */
  qrbox?: number | { width: number; height: number } | ((viewfinderWidth: number, viewfinderHeight: number) => number | { width: number; height: number });
}

const defaultFormats: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417
];

const Html5OmniScanner: React.FC<Html5OmniScannerProps> = ({ isOpen, onClose, onScan, formats = defaultFormats, qrbox }) => {
  const containerId = useRef(`html5qrcode-${Math.random().toString(36).slice(2)}`);
  const instanceRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError('');
      setStarting(true);
      
      // Cleanup any existing instance first
      if (instanceRef.current) {
        try {
          if (instanceRef.current.isScanning) {
            await instanceRef.current.stop();
          }
          await instanceRef.current.clear();
        } catch (e) {
          console.warn('[Html5OmniScanner] cleanup warning:', e);
        }
        instanceRef.current = null;
      }

      // Create fresh instance
      instanceRef.current = new Html5Qrcode(containerId.current, { verbose: false });

      const cameras = await Html5Qrcode.getCameras();
      console.log('[Html5OmniScanner] Available cameras:', cameras);
      
      const backCamera = cameras.find(c => /back|rear|environment/i.test(c.label));
      const cameraId = backCamera?.id || cameras[0]?.id;
      if (!cameraId) throw new Error('Tidak ada kamera tersedia');

      console.log('[Html5OmniScanner] Using camera:', backCamera?.label || cameras[0]?.label);

      const config: Html5QrcodeCameraScanConfig = {
        fps: 20,
        qrbox: qrbox || ((vw, vh) => {
          const size = Math.floor(Math.min(vw, vh) * 0.7);
          console.log('[Html5OmniScanner] QR box size:', size);
          return size;
        }),
        aspectRatio: 1.7778,
        disableFlip: false,
        formatsToSupport: formats,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        showTorchButtonIfSupported: true
      } as any;

      await instanceRef.current.start(
        { deviceId: { exact: cameraId } }, 
        config, 
        (decodedText) => {
          console.log('[Html5OmniScanner] Scan success:', decodedText);
          try {
            onScan(decodedText);
          } finally {
            stopScanner();
            onClose();
          }
        }, 
        () => {
          // Scan errors are normal during scanning, don't log them
        }
      );
      
      console.log('[Html5OmniScanner] Scanner started successfully');
    } catch (e: any) {
      console.error('[Html5OmniScanner] start error:', e);
      setError(e?.message || 'Gagal membuka kamera');
    } finally {
      setStarting(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (instanceRef.current) {
        const isScanning = instanceRef.current.isScanning;
        console.log('[Html5OmniScanner] Stopping scanner, isScanning:', isScanning);
        
        if (isScanning) {
          await instanceRef.current.stop();
        }
        
        // Give it a moment before clearing
        await new Promise(resolve => setTimeout(resolve, 100));
        await instanceRef.current.clear();
        
        instanceRef.current = null;
        console.log('[Html5OmniScanner] Scanner stopped and cleared');
      }
    } catch (e) {
      console.warn('[Html5OmniScanner] stop error:', e);
      instanceRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-white" />
            <h2 className="font-semibold text-white text-lg">Pindai Kode</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-4">
          <div id={containerId.current} className="w-full aspect-video bg-black/5 rounded-xl overflow-hidden" />
          {starting && (
            <p className="text-center text-slate-500 text-sm mt-3">Membuka kamera…</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Html5OmniScanner;
