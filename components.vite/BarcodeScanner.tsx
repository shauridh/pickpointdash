import { FC, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  autoStart?: boolean;
  hideManual?: boolean;
}

const BarcodeScanner: FC<BarcodeScannerProps> = ({ isOpen, onClose, onScan, autoStart = true, hideManual = true }) => {
  const [manualCode, setManualCode] = useState('');
  const [useCamera, setUseCamera] = useState<boolean>(true);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setManualCode('');
      stopCamera();
      return;
    }
    if (autoStart || hideManual) {
      setUseCamera(true);
      startCamera();
    } else {
      const timeout = window.setTimeout(() => {
        if (!useCamera) inputRef.current?.focus();
      }, 150);
      return () => {
        window.clearTimeout(timeout);
        stopCamera();
      };
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, autoStart, hideManual, useCamera]);

  const startCamera = async () => {
    try {
      // List devices for debugging
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('[BarcodeScanner] Video devices:', devices.filter(d => d.kind === 'videoinput'));
      } catch (e) {
        console.warn('[BarcodeScanner] enumerateDevices failed:', e);
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        console.warn('[BarcodeScanner] First getUserMedia failed, retrying with generic video:true', err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(e => console.warn('Video play blocked:', e));
        setScanning(true);
        setUseCamera(true);
        // Start scanning loop after video ready
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            requestAnimationFrame(tick);
          }
        }, 100);
      }
    } catch (err: any) {
      console.error('[BarcodeScanner] Camera error:', err);
      alert(`Tidak dapat mengakses kamera. (${err?.name}) ${err?.message}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setUseCamera(false);
  };

  const tick = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Try to decode with more aggressive options
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        
        if (code && code.data) {
          console.log('[BarcodeScanner] Code detected:', code.data);
          onScan(code.data);
          stopCamera();
          return;
        }
      }
    }
    
    // Continue scanning
    if (scanning) {
      requestAnimationFrame(tick);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Scan Barcode/QR Paket</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toggle Camera / Manual */}
        {!hideManual && (
          <div className="p-4 border-b border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => { stopCamera(); setUseCamera(false); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !useCamera 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Manual Input
            </button>
            <button
              type="button"
              onClick={startCamera}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                useCamera 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Scan Kamera
            </button>
          </div>
        )}

        <div className="p-4">
          {!useCamera && !hideManual ? (
            // Manual Input Mode
            <>
              <p className="mb-4 text-sm text-slate-500">
                Masukkan nomor resi/tracking untuk mengisi otomatis
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="Contoh: JNE123456789"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Gunakan Kode
                  </button>
                </div>
              </form>
            </>
          ) : (
            // Camera Scan Mode
            <>
              <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-square mb-4">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-4 border-blue-500 rounded-2xl animate-pulse"></div>
                  </div>
                )}
              </div>
              
              <p className="text-center text-sm text-slate-600">
                Arahkan kamera ke barcode/QR code pada paket
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;

