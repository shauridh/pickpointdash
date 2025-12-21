import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera } from 'lucide-react';

interface SimpleScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
  title?: string;
}

/**
 * SimpleScanner - Scanner menggunakan @zxing/library
 * Support QR code dan barcode umum (CODE128, EAN13, UPC, dll)
 */
const SimpleScanner: React.FC<SimpleScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScan,
  title = 'Scan Kode'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);

  // Handle ESC key to close scanner
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    startScanner();

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError('');
      setScanning(true);
      
      // Buat instance ZXing reader
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Get video devices
      const videoDevices = await codeReaderRef.current.listVideoInputDevices();
      
      if (videoDevices.length === 0) {
        throw new Error('Tidak ada kamera tersedia');
      }

      // Pilih kamera belakang jika ada
      const backCamera = videoDevices.find(device => 
        /back|rear|environment/i.test(device.label)
      );
      const selectedDeviceId = backCamera?.deviceId || videoDevices[0].deviceId;

      // Start decoding dari video element
      if (videoRef.current) {
        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              console.log('[SimpleScanner] Decoded:', result.getText());
              onScan(result.getText());
              cleanup();
              onClose();
            }
            if (error && !(error instanceof NotFoundException)) {
              console.warn('[SimpleScanner] Decode error:', error);
            }
          }
        );
      }
    } catch (e: any) {
      console.error('[SimpleScanner] Error:', e);
      setError('Gagal memulai scanner: ' + (e?.message || 'Unknown error'));
      setScanning(false);
    }
  };

  const cleanup = () => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
      setScanning(false);
    } catch (e) {
      console.warn('[SimpleScanner] Cleanup error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-white" />
            <h2 className="font-bold text-white text-xl">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 m-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Scanner Container - Larger */}
        <div className="p-6">
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video mb-6">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-blue-500 rounded-3xl animate-pulse"></div>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-slate-600 font-medium">
              Arahkan kamera ke QR code atau barcode
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Scanner akan otomatis menutup setelah berhasil
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
          >
            Tutup Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleScanner;
