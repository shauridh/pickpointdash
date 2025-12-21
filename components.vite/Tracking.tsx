import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { PricingService } from '../services/pricing';
import { Package, Location } from '../types';
import { Search, AlertTriangle, QrCode, X } from 'lucide-react';
import QRCodeLib from 'qrcode';

const Tracking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('id') || '');
  const [results, setResults] = useState<Array<{pkg: Package, loc: Location, fee: number}>>([]);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-search on load if param exists
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      handleSearch(id);
    }
  }, [searchParams]);

  // Generate QR Code when selected package and QR is shown
  useEffect(() => {
    const selectedResult = results.find(r => r.pkg.id === selectedPkgId);
    if (selectedResult && showQR && qrCanvasRef.current) {
      const qrData = JSON.stringify({
        id: selectedResult.pkg.id,
        tracking: selectedResult.pkg.trackingNumber,
        name: selectedResult.pkg.recipientName,
        phone: selectedResult.pkg.recipientPhone,
        pickupCode: selectedResult.pkg.pickupCode,
        location: selectedResult.loc.name
      });
      
      QRCodeLib.toCanvas(qrCanvasRef.current, qrData, {
        width: 240,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });
    }
  }, [results, selectedPkgId, showQR]);

  const handleSearch = (trackingId: string) => {
    const trimmed = trackingId.trim();
    if(!trimmed) {
      setError('Masukkan nomor resi/AWB terlebih dahulu');
      return;
    }
    setError('');
    setResults([]);

    const packages = StorageService.getPackages();
    // Pencarian publik: HANYA berdasarkan tracking number (AWB)
    const found = packages.find(p => 
      p.trackingNumber.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (found) {
      const locations = StorageService.getLocations();
      const customers = StorageService.getCustomers();
      
      // Cari SEMUA paket dengan nomor telepon yang sama
      const sameRecipientPackages = packages.filter(p => 
        p.recipientPhone === found.recipientPhone && p.status === 'ARRIVED'
      );
      
      const packageResults: Array<{pkg: Package, loc: Location, fee: number}> = [];
      
      for (const pkg of sameRecipientPackages) {
        const loc = locations.find(l => l.id === pkg.locationId);
        const cust = customers.find(c => c.phoneNumber === pkg.recipientPhone);
        
        if (loc) {
          const fee = PricingService.calculateFee(pkg, loc, cust);
          packageResults.push({ pkg, loc, fee });
        }
      }
      
      if (packageResults.length > 0) {
        setResults(packageResults);
        setSelectedPkgId(packageResults[0].pkg.id); // Auto-select first
      } else {
        setError("Data lokasi tidak ditemukan. Hubungi administrator.");
      }
    } else {
      setError("Paket tidak ditemukan. Periksa kembali nomor resi/AWB Anda.");
    }
  };

  // Polling auto-refresh jika ada query aktif
  useEffect(() => {
    if (!query) return;
    const interval = setInterval(() => {
      handleSearch(query);
    }, 5000);
    return () => clearInterval(interval);
  }, [query]);

  // Auto-show detail dari URL tanpa search field
  const isDirectLink = searchParams.get('id') && !error && results.length > 0;
  const selectedResult = results.find(r => r.pkg.id === selectedPkgId);
  const totalFee = results.reduce((sum, r) => sum + r.fee, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Search field - Hidden jika direct link dan ada result */}
          {!isDirectLink && (
            <div className="p-2 border-b border-slate-100 flex gap-2">
              <input 
                className="w-full px-4 py-3 outline-none text-slate-700 font-medium"
                placeholder="e.g. JNE123456789"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch(query)}
              />
              <button 
                onClick={() => handleSearch(query)}
                className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-slate-600 font-medium">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div>
              {/* Recipient Info Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white">
                <p className="font-bold text-sm">{results[0].pkg.recipientName}</p>
                <p className="text-xs opacity-90">Unit {results[0].pkg.unitNumber}</p>
                <p className="text-xs opacity-90">{results[0].pkg.recipientPhone}</p>
              </div>
              
              <div className="p-3 space-y-2">
                {/* Total Summary */}
                {results.some(r => r.pkg.status === 'ARRIVED') && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-orange-800 uppercase">Total {results.length} Paket</p>
                        <p className="text-[9px] text-orange-600">Bayar di kasir</p>
                      </div>
                      <p className="text-xl font-bold text-orange-600">Rp {totalFee.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Package List */}
                <div className="space-y-2">
                  {results.map((result) => (
                    <div
                      key={result.pkg.id}
                      className={`border rounded-lg p-2 cursor-pointer transition-all ${
                        selectedPkgId === result.pkg.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedPkgId(result.pkg.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-xs font-mono font-bold text-slate-800">
                            {result.pkg.trackingNumber}
                          </p>
                          <p className="text-[10px] text-slate-500">{result.loc.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(result.pkg.dates.arrived).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            result.pkg.status === 'ARRIVED'
                              ? 'bg-blue-100 text-blue-700'
                              : result.pkg.status === 'PICKED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {result.pkg.status}
                          </span>
                          {result.pkg.status === 'ARRIVED' && (
                            <p className="text-xs font-bold text-orange-600 mt-1">
                              Rp {result.fee.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* QR Button for selected package */}
                {selectedResult && selectedResult.pkg.status === 'ARRIVED' && (
                  <button
                    onClick={() => setShowQR(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    Tampilkan QR untuk {selectedResult.pkg.trackingNumber}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          &copy; 2024 Pickpoint
        </p>
      </div>

      {/* QR Code Modal */}
      {showQR && selectedResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-center font-bold text-slate-800 mb-3 text-lg">QR Code Pickup</h3>
            <p className="text-center text-xs text-slate-500 mb-4">
              Tunjukkan QR ini ke petugas untuk scan
            </p>
            
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
              <div className="bg-white p-3 rounded-lg inline-block shadow-sm w-full flex justify-center">
                <canvas ref={qrCanvasRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
