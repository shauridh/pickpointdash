import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Location } from '../types';
import { StorageService } from '../services/storage';
import { PricingService } from '../services/pricing';
import { X, CheckCircle, CreditCard } from 'lucide-react';

/**
 * PaymentPage - Halaman pembayaran untuk penerima paket
 * URL: /payment?ids=pkg1,pkg2,pkg3 (bulk) atau /payment?ids=pkg1 (single)
 * Tanpa autentikasi, public accessible
 */
const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [totalFee, setTotalFee] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<'QRIS' | 'CASH'>('QRIS');
  const [showQRModal, setShowQRModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPaymentData();
  }, [searchParams]);

  // Polling auto-refresh payment data jika belum dibayar
  useEffect(() => {
    if (isPaid) return;
    const interval = setInterval(() => {
      loadPaymentData();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaid, searchParams]);

  const loadPaymentData = () => {
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      alert('Invalid payment link - no package IDs provided');
      return;
    }

    const packageIds = idsParam.split(',').map(id => id.trim());
    const allPackages = StorageService.getPackages();
    const selectedPackages = allPackages.filter(p => packageIds.includes(p.id));

    if (selectedPackages.length === 0) {
      alert('No packages found');
      return;
    }

    setPackages(selectedPackages);
    setLocations(StorageService.getLocations());

    // Calculate total fee
    let total = 0;
    selectedPackages.forEach(pkg => {
      const location = StorageService.getLocations().find(l => l.id === pkg.locationId);
      if (location) {
        const fee = PricingService.calculateFee(pkg, location);
        total += fee;
      }
    });
    setTotalFee(total);
  };

  const handlePayment = () => {
    if (selectedMethod === 'QRIS') {
      setShowQRModal(true);
    } else {
      // CASH payment - langsung mark as paid
      processPayment();
    }
  };

  const processPayment = () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Update all packages to PAID
      packages.forEach(pkg => {
        const updatedPkg = { 
          ...pkg, 
          feePaid: PricingService.calculateFee(pkg, locations.find(l => l.id === pkg.locationId)!),
          dates: { ...pkg.dates, paid: new Date().toISOString() }
        };
        StorageService.savePackage(updatedPkg);
      });

      setIsProcessing(false);
      setIsPaid(true);
      setShowQRModal(false);

      // Auto redirect after 3 seconds
      setTimeout(() => {
        window.close(); // Try to close window
      }, 3000);
    }, 2000);
  };

  const generateDummyQR = () => {
    // Dummy QR code using placeholder service
    const qrData = `QRIS-PAYMENT-${packages.map(p => p.id).join('-')}-${totalFee}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  };

  if (isPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">Pembayaran Berhasil!</h1>
          <p className="text-slate-600 mb-4">
            Total: <span className="font-bold text-2xl text-slate-800">Rp {totalFee.toLocaleString('id-ID')}</span>
          </p>
          <p className="text-sm text-slate-500">
            {packages.length} paket telah dibayar. Silakan ambil paket Anda di lokasi pickpoint.
          </p>
          <div className="mt-6 p-4 bg-green-50 rounded-xl">
            <p className="text-xs text-green-700">Halaman ini akan otomatis tertutup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header Info Penerima */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">Pembayaran Paket</h1>
          </div>
          {/* Info penerima dan lokasi */}
          {packages.length > 0 && (
            <div className="mb-2 text-slate-700 text-sm">
              <span className="font-bold">Nama:</span> {packages[0].recipientName} <br />
              <span className="font-bold">No. HP:</span> {packages[0].recipientPhone} <br />
              <span className="font-bold">Lokasi:</span> {locations.find(l => l.id === packages[0].locationId)?.name || '-'}
            </div>
          )}
          <p className="text-slate-600">
            {packages.length} paket menunggu pembayaran
          </p>
        </div>

        {/* Package List */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-800 mb-4">📦 Detail Paket</h2>
          <div className="space-y-3">
            {packages.map((pkg, index) => {
              const location = locations.find(l => l.id === pkg.locationId);
              const fee = location ? PricingService.calculateFee(pkg, location) : 0;
              return (
                <div key={pkg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">#{index + 1} {pkg.trackingNumber}</p>
                    <p className="text-sm text-slate-600">{pkg.recipientName} • {pkg.size}</p>
                    <p className="text-xs text-slate-500">{location?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">Rp {fee.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t-2 border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-800">Total Pembayaran</p>
              <p className="text-2xl font-bold text-blue-600">Rp {totalFee.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-800 mb-4">💳 Metode Pembayaran</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedMethod('QRIS')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMethod === 'QRIS'
                  ? 'border-blue-600 bg-blue-50 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📱</div>
                <p className="font-bold text-slate-800">QRIS</p>
                <p className="text-xs text-slate-500">Scan & Bayar</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('CASH')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMethod === 'CASH'
                  ? 'border-blue-600 bg-blue-50 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">💵</div>
                <p className="font-bold text-slate-800">Tunai</p>
                <p className="text-xs text-slate-500">Bayar di lokasi</p>
              </div>
            </button>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Memproses...' : `💰 Bayar Sekarang - Rp ${totalFee.toLocaleString('id-ID')}`}
        </button>

        {/* Instruksi Pembayaran & Kontak Admin */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="font-bold text-lg text-slate-800 mb-4">📢 Instruksi Pembayaran</h2>
          <ul className="list-disc pl-6 text-slate-700 text-sm space-y-1">
            <li>Pilih metode pembayaran QRIS atau Tunai.</li>
            <li>Jika QRIS, scan QR dengan aplikasi e-wallet (GoPay, OVO, Dana, dll).</li>
            <li>Setelah pembayaran berhasil, status paket otomatis berubah LUNAS.</li>
            <li>Tunjukkan bukti pembayaran ke petugas saat pengambilan paket.</li>
          </ul>
          <div className="mt-4 text-xs text-slate-500">
            <span className="font-bold">Kontak Admin:</span> 0812-xxxx-xxxx (WA/Telepon)
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Pembayaran aman dan terenkripsi 🔒
        </p>
      </div>

      {/* QRIS Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-4xl mb-2">📱</div>
              <h3 className="text-white font-bold text-xl">Scan QRIS</h3>
              <p className="text-white/90 text-sm mt-1">Bayar menggunakan aplikasi e-wallet</p>
            </div>

            {/* QR Code */}
            <div className="p-8">
              <div className="bg-white border-4 border-blue-600 rounded-2xl p-6 mb-4">
                <img
                  src={generateDummyQR()}
                  alt="QRIS Code"
                  className="w-full h-auto"
                />
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-slate-600 mb-1">Total Pembayaran</p>
                <p className="text-3xl font-bold text-blue-600">Rp {totalFee.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-blue-800 text-center">
                  Scan QR code ini menggunakan aplikasi:<br />
                  <span className="font-semibold">GoPay, OVO, Dana, ShopeePay, LinkAja, dll</span>
                </p>
              </div>

              {/* Simulate Payment Button (Dummy) */}
              <button
                onClick={processPayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {isProcessing ? '⏳ Memproses Pembayaran...' : '✅ Simulasi Bayar (Demo)'}
              </button>

              <p className="text-xs text-center text-slate-500 mt-3">
                *Ini adalah dummy QR untuk demo. Di production, gunakan payment gateway asli.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
