"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface BackgroundScannerProps {
  enabled: boolean;
  onQRDetected?: (data: string) => void;
  onBarcodeDetected?: (data: string) => void;
  scanDelay?: number;
}

/**
 * BackgroundScanner - passive scanner without UI to detect QR/barcode.
 */
const BackgroundScanner: React.FC<BackgroundScannerProps> = ({
  enabled,
  onQRDetected,
  onBarcodeDetected,
  scanDelay = 2000,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanRef = useRef<number>(0);
  const [error, setError] = useState<string>("");

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
      setError("");

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      console.log("[BackgroundScanner] Available cameras:", videoDevices.length);

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (err) {
        console.warn("[BackgroundScanner] Environment camera failed, trying generic:", err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error("Tidak dapat mengakses kamera");
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.error("[BackgroundScanner] Error starting camera:", err);
      let errorMessage = "Gagal mengakses kamera";

      if (err.name === "NotAllowedError") {
        errorMessage = "Akses kamera ditolak. Mohon izinkan akses kamera.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "Kamera tidak ditemukan";
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Kamera tidak mendukung konfigurasi yang diminta";
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
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      const now = Date.now();
      if (now - lastScanRef.current > scanDelay) {
        lastScanRef.current = now;

        try {
          const parsed = JSON.parse(code.data);
          if (parsed.packageId || parsed.trackingNumber) {
            console.log("[BackgroundScanner] QR detected:", code.data);
            onQRDetected?.(code.data);
            return;
          }
        } catch {
          console.log("[BackgroundScanner] Barcode detected:", code.data);
          onBarcodeDetected?.(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const stopScanning = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default BackgroundScanner;
