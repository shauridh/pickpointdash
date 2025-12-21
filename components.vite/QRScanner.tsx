import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Package, Location } from '../types';
import { StorageService } from '../services/storage';
import { PricingService } from '../services/pricing';
import { Camera, X, CheckCircle, Package as PackageIcon } from 'lucide-react';

const QRScanner: React.FC<{ 
  onClose: () => void; 
  preScannedData?: string;
  onScanComplete?: (qrData: string) => void;
}> = ({ onClose, preScannedData, onScanComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<{pkg: Package, loc: Location, fee: number} | null>(null);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Jika ada pre-scanned data, langsung proses tanpa buka kamera
    if (preScannedData) {
      handleQRDetected(preScannedData);
    } else {
      startScanning();
    }
    return () => {
      stopCamera();
    };
  }, []);

  const startScanning = async () => {
    setError('');
    try {
      // Log available devices for diagnostics
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('[QRScanner] Available video input devices:', devices.filter(d => d.kind === 'videoinput'));
      } catch (e) {
        console.warn('[QRScanner] enumerateDevices failed:', e);
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
        console.warn('[QRScanner] First getUserMedia attempt failed, retrying without facingMode...', err);
        // Fallback: remove facingMode (iOS / some desktop browsers)
        const fallbackConstraints: MediaStreamConstraints = { video: true, audio: false };
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(e => console.warn('Video play blocked:', e));
        setScanning(true);
        // Start scanning loop after video ready
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            requestAnimationFrame(tick);
          }
        }, 100);
      }
    } catch (err: any) {
      const reason = err?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Klik icon kunci di address bar untuk mengizinkan.'
        : err?.name === 'NotFoundError'
          ? 'Tidak ada perangkat kamera terdeteksi.'
          : err?.name === 'OverconstrainedError'
            ? 'Kamera tidak mendukung resolusi/facingMode yang diminta.'
            : 'Tidak dapat mengakses kamera.';
      setError(`${reason}\nDetail: ${err?.name || 'Unknown'} - ${err?.message || ''}`);
      console.error('[QRScanner] Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
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
                    console.log('[QRScanner] Code detected:', code.data);
          handleQRDetected(code.data);
          return;
        }
      }
    }
    
    // Continue scanning
    if (scanning) {
      requestAnimationFrame(tick);
    }
  };

  const handleQRDetected = (qrData: string) => {
    // Notify parent component (for realtime broadcasting)
    onScanComplete?.(qrData);
    
    try {
      const data = JSON.parse(qrData);
      
      // Cari package by ID atau tracking number
      const packages = StorageService.getPackages();
      const found = packages.find(p => 
        p.id === data.id || 
        p.trackingNumber === data.tracking
      );

      if (found && found.status === 'ARRIVED') {
        const locations = StorageService.getLocations();
        const customers = StorageService.getCustomers();
        
        const loc = locations.find(l => l.id === found.locationId);
        const cust = customers.find(c => c.phoneNumber === found.recipientPhone);
        
        if (loc) {
          const fee = PricingService.calculateFee(found, loc, cust);
          setScannedData({ pkg: found, loc, fee });
          stopCamera();
        }
      } else {
        setError(found ? 'Paket sudah diambil atau tidak valid' : 'Paket tidak ditemukan');
      }
    } catch (err) {
      setError('QR Code tidak valid');
      console.error('QR parse error:', err);
    }
  };

  const handlePickup = () => {
    if (!scannedData) return;
    
    const updated: Package = {
      ...scannedData.pkg,
      status: 'PICKED',
      dates: { ...scannedData.pkg.dates, picked: new Date().toISOString() },
      feePaid: scannedData.fee
    };

    StorageService.savePackage(updated);
    StorageService.addActivity({
      id: `act_${Date.now()}`,
      type: 'PACKAGE_PICKUP',
      description: `Paket ${updated.trackingNumber} diambil oleh ${updated.recipientName}`,
      timestamp: new Date().toISOString(),
      userId: 'scanner',
      userName: 'QR Scanner',
      relatedId: updated.id
    });

    alert('✅ Paket berhasil diambil!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-white" />
            <h2 className="font-semibold text-white text-lg">Scan QR Paket</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Area */}
        {!scannedData && (
          <div className="p-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-blue-500 rounded-2xl animate-pulse"></div>
                </div>
              )}
            </div>
            
            <p className="text-center text-xs text-slate-600 mt-3">
              Arahkan kamera ke QR Code paket
            </p>
          </div>
        )}

        {/* Scanned Result */}
        {scannedData && (
          <div className="p-4 space-y-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Paket Ditemukan!</h3>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-3">
                <PackageIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-bold uppercase">Tracking Number</p>
                  <p className="font-mono font-bold text-slate-800">{scannedData.pkg.trackingNumber}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Penerima</p>
                <p className="font-bold text-slate-800">{scannedData.pkg.recipientName}</p>
                <p className="text-sm text-slate-600">{scannedData.pkg.recipientPhone}</p>
                <p className="text-sm text-slate-600">Unit {scannedData.pkg.unitNumber}</p>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Biaya Penyimpanan</p>
                <p className="text-xl font-bold text-orange-600">Rp {scannedData.fee.toLocaleString()}</p>
              </div>
            </div>

            <button
              onClick={handlePickup}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
            >
              Konfirmasi Pickup
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
