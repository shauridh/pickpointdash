import React, { useState } from 'react';
import { User } from '../types';
import { PackagePlus, QrCode } from 'lucide-react';
import SimpleScanner from './SimpleScanner';
import MobileAddPackage from './MobileAddPackage';
import { realtimeService } from '../services/realtime';
import { realtimeNet } from '../services/realtime_net';

interface StaffMobileProps {
  user: User;
  onLogout?: () => void;
}

/**
 * StaffMobile - Halaman khusus untuk petugas mobile
 * Menampilkan 2 tombol besar: SIMPAN (tambah paket) dan AMBIL (scan QR pickup)
 * Optimized untuk mobile, tanpa scroll
 */
const StaffMobile: React.FC<StaffMobileProps> = ({ user, onLogout }) => {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);

  // Handler untuk tombol SIMPAN - tampilkan form mobile
  const handleSimpan = () => {
    setShowAddPackage(true);
  };

  // Handler untuk tombol AMBIL - langsung buka QR scanner
  const handleAmbil = () => {
    setIsQRScannerOpen(true);
  };

  // Jika show add package, tampilkan form tambah paket mobile
  if (showAddPackage) {
    return (
      <MobileAddPackage 
        user={user} 
        onClose={() => setShowAddPackage(false)}
        onSuccess={() => setShowAddPackage(false)}
      />
    );
  }

  // Menu utama - 2 tombol besar
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <PackagePlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">PickPoint Staff</h1>
          <p className="text-slate-500">Halo, {user.name}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Tombol SIMPAN */}
          <button
            onClick={handleSimpan}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center gap-3">
              <PackagePlus className="w-16 h-16" strokeWidth={1.5} />
              <div>
                <div className="text-2xl font-bold mb-1">SIMPAN</div>
                <div className="text-sm text-blue-100">Tambah paket masuk</div>
              </div>
            </div>
          </button>

          {/* Tombol AMBIL */}
          <button
            onClick={handleAmbil}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center gap-3">
              <QrCode className="w-16 h-16" strokeWidth={1.5} />
              <div>
                <div className="text-2xl font-bold mb-1">AMBIL</div>
                <div className="text-sm text-purple-100">Scan QR untuk pickup</div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-slate-400 mt-8">
          <p>Lokasi: {user.locationId || '-'}</p>
          <p className="mt-1">Mode Mobile Staff</p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mt-4 text-red-500 underline"
            >
              Keluar
            </button>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      <SimpleScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={(text) => {
          console.log('[StaffMobile] QR Scanned:', text);
          // Broadcast ke desktop untuk membuka popup
          realtimeService.broadcast('QR_SCANNED', text);
          // Cross-device broadcast via Supabase Realtime (dengan userId untuk filter per staff)
          realtimeNet.broadcast('QR_SCANNED', text, user.id);
          alert('QR berhasil di-scan. Cek di desktop untuk proses pickup.');
          setIsQRScannerOpen(false);
        }}
        title="Scan QR Pickup"
      />
    </div>
  );
};

export default StaffMobile;
