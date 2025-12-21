import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface BackgroundScannerProps {
  /** Aktifkan scanner QR/barcode di background */
  enabled: boolean;
  /** Callback ketika QR code terdeteksi */
  onQRDetected?: (data: string) => void;
  /** Callback ketika barcode terdeteksi */
  onBarcodeDetected?: (data: string) => void;
  /** Delay minimum antar scan (ms) untuk menghindari duplicate */
  scanDelay?: number;
}

/**
 * BackgroundScanner - Mendeteksi QR/barcode secara otomatis tanpa UI modal
 * Berjalan di background dan trigger callback ketika kode terdeteksi
 */
const BackgroundScanner: React.FC<BackgroundScannerProps> = ({ 
  enabled, 
  onQRDetected, 
  onBarcodeDetected,
  scanDelay = 2000 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanRef = useRef<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!enabled) {
      stopScanning();
      return;
    }

    startScanning();

    return () => {
      stopScanning();
    };
  }, [enabled]);

  const startScanning = async () => {
    try {
      setError('');
      
      // Enumerate devices for debugging
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      console.log('[BackgroundScanner] Available cameras:', videoDevices.length);

      let stream: MediaStream | null = null;

      // Try environment camera first (back camera on mobile)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      } catch (err) {
        console.warn('[BackgroundScanner] Environment camera failed, trying generic:', err);
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (!stream) {
        throw new Error('Tidak dapat mengakses kamera');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Start scan loop
        scanFrame();
      }

    } catch (err: any) {
      console.error('[BackgroundScanner] Error starting camera:', err);
      let errorMessage = 'Gagal mengakses kamera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Akses kamera ditolak. Mohon izinkan akses kamera.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Kamera tidak ditemukan';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Kamera tidak mendukung konfigurasi yang diminta';
      }
      
      setError(errorMessage);
    }
  };

  const scanFrame = () => {
    if (!enabled || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Try to decode QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code) {
      const now = Date.now();
      // Check if enough time has passed since last scan
      if (now - lastScanRef.current > scanDelay) {
        lastScanRef.current = now;
        
        // Determine if it's a QR code or barcode based on content
        // Customer QR codes contain JSON with pickup info
        // AWB barcodes are typically alphanumeric strings
        
        try {
          const parsed = JSON.parse(code.data);
          // If parseable as JSON and contains package info, it's a customer QR
          if (parsed.packageId || parsed.trackingNumber) {
            console.log('[BackgroundScanner] QR detected:', code.data);
            onQRDetected?.(code.data);
            return; // Stop scanning after detection
          }
        } catch {
          // Not JSON, likely a barcode
          console.log('[BackgroundScanner] Barcode detected:', code.data);
          onBarcodeDetected?.(code.data);
          return; // Stop scanning after detection
        }
      }
    }

    // Continue scanning
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const stopScanning = () => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Hidden video and canvas elements
  return (
    <div style={{ display: 'none' }}>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default BackgroundScanner;
