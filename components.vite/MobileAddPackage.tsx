import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { User, Package, PackageSize, Customer, Location } from '../types';
import { StorageService } from '../services/storage';
import { WhatsAppService } from '../services/whatsapp';
import { COURIER_OPTIONS } from '../constants';
import { X, Camera, Scan } from 'lucide-react';
import SimpleScanner from './SimpleScanner';

interface MobileAddPackageProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const MobileAddPackage: React.FC<MobileAddPackageProps> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    tracking: '',
    recipientName: '',
    recipientPhone: '',
    unitNumber: '',
    courier: COURIER_OPTIONS[0],
    size: 'M' as PackageSize,
    locationId: user.locationId || '',
    photo: ''
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const allCustomers = StorageService.getCustomers();
    // Filter hanya customer di lokasi petugas
    const filteredByLocation = user.locationId 
      ? allCustomers.filter(c => c.locationId === user.locationId)
      : allCustomers;
    setCustomers(filteredByLocation);
    setLocations(StorageService.getLocations());
  }, [user.locationId]);

  // Check if current location uses SIZE pricing
  const currentLocation = locations.find(loc => loc.id === formData.locationId);
  const showSizeField = currentLocation?.pricing?.type === 'SIZE';

  // Auto-close countdown setelah success
  useEffect(() => {
    if (showSuccessDialog && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showSuccessDialog && countdown === 0) {
      setShowSuccessDialog(false);
      // Auto kembali ke home setelah 3 detik
      onClose();
    }
  }, [showSuccessDialog, countdown, onClose]);

  // Handle ESC key to close camera modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTakingPhoto) setIsTakingPhoto(false);
        if (isBarcodeScannerOpen) setIsBarcodeScannerOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isTakingPhoto, isBarcodeScannerOpen]);

  const handleNameInput = (val: string) => {
    if (val.trim() === '') {
      setFormData(prev => ({ 
        ...prev, 
        recipientName: '', 
        recipientPhone: '', 
        unitNumber: '' 
      }));
      setIsAutoFilled(false);
      setShowSuggestions(false);
      return;
    }

    setFormData(prev => ({ ...prev, recipientName: val }));
    setIsAutoFilled(false);

    if (val.length > 0) {
      const matches = customers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
      setFilteredCustomers(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (cust: Customer) => {
    setFormData(prev => ({
      ...prev,
      recipientName: cust.name,
      recipientPhone: cust.phoneNumber,
      unitNumber: cust.unitNumber,
      locationId: prev.locationId
    }));
    setIsAutoFilled(true);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!formData.locationId) {
      alert('Pilih lokasi terlebih dahulu.');
      return;
    }

    // Validasi: hanya bisa input paket di lokasi sendiri
    if (user.locationId && formData.locationId !== user.locationId) {
      alert('⚠️ Anda hanya dapat menginput paket di lokasi Anda sendiri.');
      return;
    }

    const trackingNumber = formData.tracking.trim();
    if (!trackingNumber) {
      alert('Nomor resi/awb wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    const recipientPhone = formData.recipientPhone.trim();

    const newPkg: Package = {
      id: `pkg_${Date.now()}`,
      trackingNumber,
      recipientName: formData.recipientName,
      recipientPhone,
      unitNumber: formData.unitNumber,
      courier: formData.courier,
      size: formData.size,
      locationId: formData.locationId,
      status: 'ARRIVED',
      dates: { arrived: new Date().toISOString() },
      feePaid: 0,
      photo: formData.photo,
      notificationStatus: 'PENDING'
    };

    // Check if new customer needed
    const existingCust = customers.find(c => c.phoneNumber === recipientPhone);
    if (!existingCust) {
      StorageService.saveCustomer({
        id: `cust_${Date.now()}`,
        name: formData.recipientName,
        phoneNumber: recipientPhone,
        unitNumber: formData.unitNumber,
        locationId: formData.locationId,
        isMember: false
      });
    }

    // Send WhatsApp notification
    let finalNotificationStatus: Package['notificationStatus'] = 'PENDING';
    const loc = locations.find(l => l.id === newPkg.locationId);
    if (loc) {
      const settings = StorageService.getSettings();
      const success = await WhatsAppService.sendNotification(newPkg, loc, settings);
      finalNotificationStatus = success ? 'SENT' : 'FAILED';
      if (!success) {
        alert('Notifikasi WhatsApp gagal dikirim.');
      }
    }

    StorageService.savePackage({ ...newPkg, notificationStatus: finalNotificationStatus });
    
    // Trigger broadcast realtime untuk refresh dashboard
    onSuccess();
    
    // Reset form dan show success dialog
    setIsSubmitting(false);
    setFormData({
      tracking: '',
      recipientName: '',
      recipientPhone: '',
      unitNumber: '',
      courier: COURIER_OPTIONS[0],
      size: 'M' as PackageSize,
      locationId: user.locationId || '',
      photo: ''
    });
    setIsAutoFilled(false);
    setShowSuccessDialog(true);
    setCountdown(3);
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFormData(prev => ({ ...prev, photo: imageSrc }));
      setIsTakingPhoto(false);
    }
  };

  const videoConstraints = {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      {isTakingPhoto && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between p-4 bg-black/80">
            <h3 className="text-white font-semibold">Ambil Foto Paket</h3>
            <button
              type="button"
              onClick={() => setIsTakingPhoto(false)}
              className="text-white p-2"
              aria-label="Tutup kamera"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 bg-black/80 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="bg-white text-slate-800 rounded-full p-4 shadow-lg"
              aria-label="Ambil foto"
            >
              <Camera className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 flex items-center justify-between z-10 shadow-md">
        <h2 className="font-bold text-xl text-white">📦 Tambah Paket</h2>
        <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form - Minimalis */}
      <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-24">
        {/* AWB - Compact */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <label className="block text-xs font-bold text-slate-600 mb-2">NOMOR RESI / AWB *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.tracking}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking: e.target.value }))}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Masukkan nomor resi"
              required
            />
            <button
              type="button"
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="Scan barcode"
            >
              <Scan className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nama Penerima with Search - Compact */}
        <div className="relative bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <label className="block text-xs font-bold text-slate-600 mb-2">NAMA PENERIMA *</label>
          <input
            type="text"
            value={formData.recipientName}
            onChange={(e) => handleNameInput(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Ketik nama untuk mencari..."
            required
          />
          {showSuggestions && filteredCustomers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredCustomers.map(cust => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => selectCustomer(cust)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-0"
                >
                  <div className="font-semibold text-slate-800">{cust.name}</div>
                  <div className="text-xs text-slate-500">{cust.phoneNumber} • Unit {cust.unitNumber}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Penerima - Combined compact */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">NOMOR TELEPON *</label>
            <input
              type="tel"
              value={formData.recipientPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
              disabled={isAutoFilled}
              placeholder="08xxxxxxxxxx"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">NOMOR UNIT *</label>
            <input
              type="text"
              value={formData.unitNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, unitNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
              disabled={isAutoFilled}
              placeholder="Contoh: A-123"
              required
            />
          </div>
        </div>

        {/* Kurir & Size - Compact */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">KURIR</label>
            <select
              value={formData.courier}
              onChange={(e) => setFormData(prev => ({ ...prev, courier: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {COURIER_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Ukuran - Only show if location uses SIZE pricing */}
          {showSizeField && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">UKURAN PAKET</label>
              <div className="grid grid-cols-3 gap-2">
                {(['S', 'M', 'L'] as PackageSize[]).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, size }))}
                    className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                      formData.size === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Foto - Compact */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <label className="block text-xs font-bold text-slate-600 mb-2">FOTO PAKET <span className="text-slate-400 font-normal">(Opsional)</span></label>
          {formData.photo ? (
            <div className="relative">
              <img src={formData.photo} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsTakingPhoto(true)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-semibold text-sm"
            >
              <Camera className="w-4 h-4" />
              Ambil Foto
            </button>
          )}
        </div>
      </form>

      {/* Fixed Bottom Actions - Minimalis */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-white/95 border-t border-slate-200 p-3 flex gap-2 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold shadow-lg"
        >
          💾 Simpan Paket
        </button>
      </div>

      {/* Barcode Scanner */}
      <SimpleScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(code) => {
          setFormData(prev => ({ ...prev, tracking: code }));
          setIsBarcodeScannerOpen(false);
        }}
        title="Scan AWB / Barcode"
      />

      {/* Camera Modal - Setengah Layar */}
      {isTakingPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsTakingPhoto(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-black/60">
              <h3 className="text-white font-bold text-lg">📸 Ambil Foto</h3>
              <button
                type="button"
                onClick={() => setIsTakingPhoto(false)}
                className="text-white p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Tutup kamera"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Camera Preview - Setengah tinggi */}
            <div className="relative bg-slate-900 aspect-[3/4]">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(1)' }}
              />
              {/* Grid overlay for composition guide */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                </div>
              </div>
            </div>
            
            {/* Shutter Button - Jelas Terlihat */}
            <div className="p-6 bg-black flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="bg-white rounded-full p-5 shadow-2xl active:scale-95 transition-transform hover:scale-105"
                aria-label="Ambil foto"
              >
                <Camera className="w-10 h-10 text-blue-600" />
              </button>
              <p className="text-white/80 text-sm font-medium">Tap untuk mengambil foto</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog - Auto close 3 detik */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header Success */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
              <div className="text-6xl mb-2">✅</div>
              <h3 className="text-white font-bold text-xl">Paket Berhasil Disimpan!</h3>
              <p className="text-white/90 text-sm mt-1">Auto close dalam {countdown} detik...</p>
            </div>

            {/* Action Buttons */}
            <div className="p-6 space-y-3">
              <button
                onClick={() => {
                  setShowSuccessDialog(false);
                  setCountdown(3);
                  // Reset untuk input lagi
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                📦 Input Paket Lagi
              </button>
              
              <button
                onClick={() => {
                  setShowSuccessDialog(false);
                  onClose();
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                🏠 Kembali ke Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAddPackage;
