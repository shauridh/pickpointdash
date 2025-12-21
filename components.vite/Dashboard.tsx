import React, { useEffect, useState, useRef, useMemo } from 'react';
import { User, Package, DashboardStats, PackageSize, Customer, Location } from '../types';
import { StorageService } from '../services/storage';
import { PricingService } from '../services/pricing';
import { WhatsAppService } from '../services/whatsapp';
import { COURIER_OPTIONS } from '../constants';
import { realtimeService } from '../services/realtime';
import { realtimeNet } from '../services/realtime_net';
import { 
  Package as PackageIcon, DollarSign, Users, Activity, 
  ArrowUpRight, ArrowDownRight, Search, Plus, 
  /* QrCode, */ X, Truck, MessageCircle, Trash2, Camera, Lock,
  PackageCheck, Loader2, Wallet, ZoomIn, ZoomOut, Scan
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
// import QRScanner from './QRScanner';
// import BarcodeScanner from './BarcodeScanner';
// import Html5OmniScanner from './Html5OmniScanner';
// import { useToast } from '../context/ToastContext';
// import BackgroundScanner from './BackgroundScanner';
import SimpleScanner from './SimpleScanner';

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return dateTimeFormatter.format(date);
};

const formatCurrency = (value?: number) => {
  if (!value || value <= 0) return '-';
  return currencyFormatter.format(value);
};

const exportPackagesToCSV = (packages: Package[]) => {
  const headers = [
    'Nomor AWB',
    'Nama Penerima',
    'Nomor Unit',
    'Nomor Telepon',
    'Kurir',
    'Ukuran',
    'Lokasi',
    'Status Paket',
    'Tiba',
    'Diambil',
    'Dimusnahkan',
    'Biaya Dibayar',
    'Status Notifikasi'
  ];
  const rows = packages.map(pkg => [
    pkg.trackingNumber,
    pkg.recipientName,
    pkg.unitNumber,
    pkg.recipientPhone,
    pkg.courier,
    pkg.size,
    pkg.locationId,
    pkg.status,
    pkg.dates.arrived,
    pkg.dates.picked || '',
    pkg.dates.destroyed || '',
    pkg.feePaid,
    pkg.notificationStatus
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `packages_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface DashboardProps {
  user: User;
  openAddModal?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, openAddModal = false }) => {
  // const { showToast } = useToast();
    // State untuk expand/collapse KPI
    const [kpiExpanded, setKpiExpanded] = useState(true);
  // --- STATE: DASHBOARD & PACKAGES ---
  const [filter, setFilter] = useState<'DAY' | 'WEEK' | 'MONTH' | 'ALL'>('DAY');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Package Management State
  const [packages, setPackages] = useState<Package[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [selectedPickupIds, setSelectedPickupIds] = useState<string[]>([]);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [isPhotoVisible, setIsPhotoVisible] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<any | null>(null);
  
  // Background scanning for dashboard QR detection
  // const dashboardScanEnabled = user.role === 'STAFF';
  // const [preScannedQR, setPreScannedQR] = useState<string>('');

  // Form Data
  const [formData, setFormData] = useState({
    tracking: '',
    recipientName: '',
    recipientPhone: '',
    unitNumber: '',
    courier: COURIER_OPTIONS[0],
    size: 'M' as PackageSize,
    locationId: user.role === 'STAFF' ? user.locationId! : '',
    photo: ''
  });

  // Suggestion State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isAutoFilled, setIsAutoFilled] = useState(false); // State to lock fields

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);



  // Handle ESC key to close all modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scannedQRData) setScannedQRData(null);
        if (isQRScannerOpen) setIsQRScannerOpen(false);
        if (isBarcodeScannerOpen) setIsBarcodeScannerOpen(false);
        if (selectedPkg) setSelectedPkg(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [scannedQRData, isQRScannerOpen, isBarcodeScannerOpen, selectedPkg]);

  // --- LOADING DATA ---
  const loadData = () => {
    const allPkgs = StorageService.getPackages();
    const allCusts = StorageService.getCustomers();
    setPackages(allPkgs);
    setCustomers(allCusts);
    setLocations(StorageService.getLocations());
    calculateStats(allPkgs, allCusts);
  };

  const locationMap = useMemo(() => {
    const map: Record<string, Location> = {};
    locations.forEach(loc => {
      map[loc.id] = loc;
    });
    return map;
  }, [locations]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [filter, user]);

  // Auto-open Add Modal jika dipanggil dari StaffMobile
  useEffect(() => {
    if (openAddModal) {
      setIsAddModalOpen(true);
    }
  }, [openAddModal]);

  // Listen for realtime events from other devices (mobile scan → desktop popup)
    useEffect(() => {
    const unsubscribe = realtimeService.on('QR_SCANNED', (qrData: string) => {
      
      // Cari paket berdasarkan QR data
      const code = (qrData || '').trim();
      if (!code) return;
      let lower = code.toLowerCase();

      // Parse JSON QR if applicable
      let parsed: any | null = null;
      if (code.startsWith('{') && code.endsWith('}')) {
        try {
          parsed = JSON.parse(code);
        } catch {}
      }
      const tryTracking = parsed?.tracking || parsed?.awb || null;
      // const tryPhone = parsed?.phone || parsed?.recipientPhone || null;
      // const tryName = parsed?.name || parsed?.recipientName || null;
      if (tryTracking) lower = String(tryTracking).toLowerCase();
      
      const candidatePkgs = packages.filter(p => {
        const matches = p.trackingNumber.toLowerCase() === lower ||
          p.trackingNumber.toLowerCase().includes(lower) ||
          p.recipientPhone === code ||
          p.recipientName.toLowerCase().includes(lower);
        const locationOk = user.role === 'STAFF' ? p.locationId === user.locationId : true;
        return matches && locationOk && p.status === 'ARRIVED';
      });
      
      if (candidatePkgs.length > 0) {
        setSelectedPkg(candidatePkgs[0]);
      } else {
        // Fallback: show scanned data modal for manual action
        setScannedQRData(parsed || code);
      }
    });

    return () => unsubscribe();
    }, [packages, user]);

  // Cross-device events via Supabase Realtime (filtered per user)
  useEffect(() => {
    realtimeNet.subscribe();
    // Filter: hanya terima event dari user yang sama (staff A HP -> staff A desktop)
    const off = realtimeNet.on('QR_SCANNED', (qrData: string) => {
      const code = (qrData || '').trim();
      if (!code) return;
      let lower = code.toLowerCase();

      // Parse JSON QR if applicable
      let parsed: any | null = null;
      if (code.startsWith('{') && code.endsWith('}')) {
        try {
          parsed = JSON.parse(code);
        } catch {}
      }
      const tryTracking = parsed?.tracking || parsed?.awb || null;
      // const tryPhone = parsed?.phone || parsed?.recipientPhone || null;
      // const tryName = parsed?.name || parsed?.recipientName || null;
      if (tryTracking) lower = String(tryTracking).toLowerCase();
      const candidatePkgs = packages.filter(p => {
        const matches = p.trackingNumber.toLowerCase() === lower ||
          p.trackingNumber.toLowerCase().includes(lower) ||
          p.recipientPhone === code ||
          p.recipientName.toLowerCase().includes(lower);
        const locationOk = user.role === 'STAFF' ? p.locationId === user.locationId : true;
        return matches && locationOk && p.status === 'ARRIVED';
      });
      if (candidatePkgs.length > 0) {
        setSelectedPkg(candidatePkgs[0]);
      } else {
        setScannedQRData(parsed || code);
      }
    }, user.id); // Pass user.id sebagai filter - hanya terima dari user yang sama
    return () => { off(); };
  }, [packages, user]);


  // Handler untuk QR customer terdeteksi - auto-open QR Scanner modal
  /* const handleQRDetected = (data: string) => {
    // removed: preScannedQR handling; using modal open directly
    setIsQRScannerOpen(true);
  }; */

  const calculateStats = (allPkgs: Package[], allCusts: Customer[]) => {
    const relevantPkgs = user.role === 'STAFF'
      ? allPkgs.filter(p => p.locationId === user.locationId)
      : allPkgs;

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    let filteredForStats = relevantPkgs;
    if (filter === 'DAY') {
      filteredForStats = relevantPkgs.filter(p => new Date(p.dates.arrived) >= startOfToday);
    } else if (filter === 'WEEK') {
      const weekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredForStats = relevantPkgs.filter(p => new Date(p.dates.arrived) >= weekAgo);
    } else if (filter === 'MONTH') {
      const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1));
      filteredForStats = relevantPkgs.filter(p => new Date(p.dates.arrived) >= monthAgo);
    }

    const revPackage = filteredForStats.reduce((acc, curr) => acc + (curr.feePaid || 0), 0);
    const revDelivery = filteredForStats.filter(p => p.status === 'PICKED').length * 0;
    const revMembership = 0;
    const membersActiveCount = allCusts ? allCusts.length : 0;

    const statsObj: DashboardStats = {
      packagesIn: filteredForStats.filter(p => p.status === 'ARRIVED').length,
      packagesOut: filteredForStats.filter(p => p.status === 'PICKED').length,
      inventoryActive: relevantPkgs.filter(p => p.status === 'ARRIVED').length,
      membersActive: membersActiveCount,
      revDelivery,
      revMembership,
      revPackage,
      totalRevenue: revPackage + revDelivery + revMembership
    };
    setStats(statsObj);
  };

  const filteredPackages = useMemo(() => {
    const query = search.toLowerCase();
    let res = packages.filter(p => {
      const matchesSearch =
        p.trackingNumber.toLowerCase().includes(query) ||
        p.recipientName.toLowerCase().includes(query) ||
        p.unitNumber.toLowerCase().includes(query) ||
        p.recipientPhone.includes(query);

      const matchesLoc = user.role === 'STAFF' ? p.locationId === user.locationId : true;
      return matchesSearch && matchesLoc;
    });

    return res.sort((a, b) => new Date(b.dates.arrived).getTime() - new Date(a.dates.arrived).getTime());
  }, [packages, search, user]);

  const selectablePackages = useMemo(() => filteredPackages.filter(pkg => pkg.status === 'ARRIVED'), [filteredPackages]);
  const selectableIds = useMemo(() => selectablePackages.map(pkg => pkg.id), [selectablePackages]);

  useEffect(() => {
    setSelectedPickupIds(prev => prev.filter(id => selectableIds.includes(id)));
  }, [packages, selectableIds]);

  useEffect(() => {
    if (!selectedPkg) {
      setIsPhotoZoomed(false);
      setIsPhotoVisible(false);
    }
  }, [selectedPkg]);

  useEffect(() => {
    if (selectAllRef.current) {
      const total = selectableIds.length;
      selectAllRef.current.indeterminate = selectedPickupIds.length > 0 && selectedPickupIds.length < total;
    }
  }, [selectedPickupIds, selectableIds]);
  const handleNameInput = (val: string) => {
    // If empty, clear everything and unlock
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
    
    // If user types, we unlock to allow new entry, unless they select from dropdown again
    setIsAutoFilled(false);

    if (val.length > 0) {
      // Filter customer: staff hanya lihat customer di lokasi sendiri
      let matches = customers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
      if (user.role === 'STAFF' && user.locationId) {
        matches = matches.filter(c => c.locationId === user.locationId);
      }
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
      // Auto-select location if Admin, otherwise keep staff location
      locationId: user.role === 'ADMIN' ? cust.locationId : prev.locationId 
    }));
    setIsAutoFilled(true); // Lock the fields
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId) {
      alert('Pilih lokasi terlebih dahulu.');
      return;
    }

    const trackingNumber = formData.tracking.trim();
    if (!trackingNumber) {
      alert('Nomor resi/awb wajib diisi.');
      return;
    }

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

    // Trigger WhatsApp notification and persist final status
    let finalNotificationStatus: Package['notificationStatus'] = 'PENDING';
    const loc = locations.find(l => l.id === newPkg.locationId);
    if (loc) {
      const settings = StorageService.getSettings();
      const success = await WhatsAppService.sendNotification(newPkg, loc, settings);
      finalNotificationStatus = success ? 'SENT' : 'FAILED';
      if (!success) {
        alert('Notifikasi WhatsApp gagal dikirim. Silakan periksa pengaturan gateway.');
      }
    } else {
      finalNotificationStatus = 'FAILED';
      alert('Lokasi paket tidak ditemukan, notifikasi tidak dapat dikirim.');
    }

    StorageService.savePackage({ ...newPkg, notificationStatus: finalNotificationStatus });

    setIsAddModalOpen(false);
    setFormData({ ...formData, tracking: '', recipientName: '', recipientPhone: '', unitNumber: '', photo: '' });
    setIsAutoFilled(false);
    loadData();
  };

  const markPackagePicked = (pkg: Package, fee: number) => {
    const paidAt = new Date().toISOString();
    const updated: Package = {
      ...pkg,
      status: 'PICKED',
      dates: { ...pkg.dates, picked: paidAt },
      feePaid: fee,
      paymentTimestamp: paidAt
    };
    StorageService.savePackage(updated);
  };

  const handlePickup = (pkg: Package) => {
    const loc = locations.find(l => l.id === pkg.locationId);
    const cust = customers.find(c => c.phoneNumber === pkg.recipientPhone);
    if (!loc) return;

    const fee = PricingService.calculateFee(pkg, loc, cust);

    if (confirm(`Konfirmasi pickup untuk ${pkg.trackingNumber}?\nTotal bayar: Rp ${fee.toLocaleString()}`)) {
      markPackagePicked(pkg, fee);
      setSelectedPkg(null);
      setSelectedPickupIds(prev => prev.filter(id => id !== pkg.id));
      loadData();
    }
  };

  const handleSendPaymentLink = () => {
    const candidates = packages.filter(p => selectedPickupIds.includes(p.id) && p.status === 'ARRIVED');
    if (candidates.length === 0) {
      alert('Pilih paket untuk membuat link pembayaran.');
      return;
    }

    const packageIds = candidates.map(p => p.id).join(',');
    const paymentLink = `${window.location.origin}/payment?ids=${packageIds}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(paymentLink).then(() => {
      alert(`✅ Link pembayaran berhasil disalin!\n\n${paymentLink}\n\nKirim link ini ke penerima paket.`);
    }).catch(() => {
      alert(`Link pembayaran:\n\n${paymentLink}\n\nSalin link ini dan kirim ke penerima.`);
    });
  };

  const handleBulkPickup = () => {
    const candidates = packages.filter(p => selectedPickupIds.includes(p.id) && p.status === 'ARRIVED');
    if (candidates.length === 0) {
      alert('Pilih paket dengan status tersimpan untuk diproses pickup.');
      return;
    }

    let hasMissingLocation = false;
    const feeEntries = candidates
      .map(pkg => {
        const loc = locations.find(l => l.id === pkg.locationId);
        if (!loc) {
          hasMissingLocation = true;
          return null;
        }
        const cust = customers.find(c => c.phoneNumber === pkg.recipientPhone);
        const fee = PricingService.calculateFee(pkg, loc, cust);
        return { pkg, fee };
      })
      .filter((entry): entry is { pkg: Package; fee: number } => Boolean(entry));

    if (hasMissingLocation || feeEntries.length === 0) {
      alert('Lokasi paket tidak ditemukan. Periksa data lokasi sebelum melanjutkan.');
      return;
    }

    const totalFee = feeEntries.reduce((sum, entry) => sum + entry.fee, 0);
    const summaryList = feeEntries.map(entry => `• ${entry.pkg.trackingNumber} (${entry.pkg.recipientName})`).join('\n');
    const confirmationMessage = [
      `Konfirmasi pickup ${feeEntries.length} paket:`,
      summaryList,
      '',
      `Total estimasi bayar: ${totalFee > 0 ? currencyFormatter.format(totalFee) : 'Rp 0'}`,
      '',
      'Lanjutkan?'
    ].join('\n');

    if (!confirm(confirmationMessage)) return;

    feeEntries.forEach(({ pkg, fee }) => markPackagePicked(pkg, fee));
    setSelectedPickupIds([]);
    setSelectedPkg(null);
    loadData();
  };

  const togglePickupSelection = (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg || pkg.status !== 'ARRIVED') return;
    setSelectedPickupIds(prev =>
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    );
  };

  const handleSelectAllEligible = (checked: boolean) => {
    if (checked) {
      setSelectedPickupIds(selectableIds);
    } else {
      setSelectedPickupIds([]);
    }
  };

  const handleDestroy = (pkg: Package) => {
    if (confirm("Tandai paket ini sebagai dimusnahkan/hilang?")) {
      const updated: Package = {
        ...pkg,
        status: 'DESTROYED',
        dates: { ...pkg.dates, destroyed: new Date().toISOString() },
      };
      StorageService.savePackage(updated);
      setSelectedPkg(null);
      loadData();
    }
  };

  const handleMarkPaid = (pkg: Package) => {
    if (pkg.feePaid > 0) return;
    const loc = locations.find(l => l.id === pkg.locationId);
    const cust = customers.find(c => c.phoneNumber === pkg.recipientPhone);
    const suggestion = loc ? PricingService.calculateFee(pkg, loc, cust) : pkg.feePaid;
    const input = prompt('Masukkan nominal pembayaran (Rp)', suggestion > 0 ? String(suggestion) : '');
    if (!input) return;
    const normalized = Number(input.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(normalized) || normalized <= 0) {
      alert('Nominal pembayaran tidak valid.');
      return;
    }
    const paidAt = new Date().toISOString();
    const updated: Package = {
      ...pkg,
      feePaid: normalized,
      paymentTimestamp: paidAt
    };
    StorageService.savePackage(updated);
    loadData();
  };

  const handleResendNotification = async (pkg: Package) => {
    const loc = locations.find(l => l.id === pkg.locationId);
    if (!loc) {
      alert('Lokasi paket tidak ditemukan.');
      return;
    }
    setActionBusy(`resend-${pkg.id}`);
    const settings = StorageService.getSettings();
    try {
      const success = await WhatsAppService.sendNotification(pkg, loc, settings);
      const updated: Package = {
        ...pkg,
        notificationStatus: success ? 'SENT' : 'FAILED'
      };
      StorageService.savePackage(updated);
      loadData();
      if (!success) {
        alert('Pengiriman notifikasi gagal. Silakan coba lagi.');
      }
    } finally {
      setActionBusy(null);
    }
  };

  const getPackageStatusMeta = (pkg: Package) => {
    if (pkg.status === 'PICKED') {
      return {
        label: 'Diambil',
        className: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        timestamp: formatDateTime(pkg.dates.picked)
      };
    }
    if (pkg.status === 'DESTROYED') {
      return {
        label: 'Dimusnahkan',
        className: 'bg-rose-50 text-rose-600 border border-rose-100',
        timestamp: formatDateTime(pkg.dates.destroyed)
      };
    }
    return {
      label: 'Tersimpan',
      className: 'bg-slate-100 text-slate-600 border border-slate-200',
      timestamp: formatDateTime(pkg.dates.arrived)
    };
  };

  const getNotificationMeta = (status: Package['notificationStatus']) => {
    if (status === 'SENT') {
      return {
        label: 'Terkirim',
        className: 'bg-emerald-50 text-emerald-600 border border-emerald-100'
      };
    }
    if (status === 'FAILED') {
      return {
        label: 'Gagal',
        className: 'bg-rose-50 text-rose-600 border border-rose-100'
      };
    }
    return {
      label: 'Menunggu',
      className: 'bg-amber-50 text-amber-600 border border-amber-100'
    };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, photo: ev.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Helper to get selected location details
  const getSelectedLocation = () => locations.find(l => l.id === formData.locationId);

  const firstName = user.name.split(' ')[0] || user.name;
  const actionButtonClass = 'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200';

  // --- UI COMPONENTS ---
  const StatCard = ({ label, value, icon: Icon, color, sub }: any) => (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm transition-all hover:shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-indigo-50/60" aria-hidden="true" />
      <div className={twMerge("absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-20", color)} aria-hidden="true" />
      <div className="relative flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">{label}</p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">{value}</h3>
          </div>
          <div className={twMerge("rounded-xl p-2.5 text-white shadow-inner shadow-black/10", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {sub && <p className="text-xs font-medium text-slate-400">{sub}</p>}
      </div>
    </div>
  );

  const allSelectableChecked = selectableIds.length > 0 && selectableIds.every(id => selectedPickupIds.includes(id));

  // Emergency close untuk semua modal
  const handleEmergencyClose = () => {
    setScannedQRData(null);
    setIsQRScannerOpen(false);
    setIsBarcodeScannerOpen(false);
    setSelectedPkg(null);
    console.log('[Dashboard] Emergency close executed - all modals closed');
  };

  return (
    <div className="space-y-10">
      {/* Emergency Close Button - Floating */}
      {(scannedQRData || isQRScannerOpen || isBarcodeScannerOpen || selectedPkg) && (
        <button
          onClick={handleEmergencyClose}
          className="fixed bottom-4 right-4 z-[999] bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 font-bold animate-pulse"
          title="Tutup semua modal"
        >
          <X className="w-6 h-6" />
          <span className="hidden sm:inline">TUTUP</span>
        </button>
      )}

      {scannedQRData && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" 
          onClick={(e) => {
            e.stopPropagation();
            setScannedQRData(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Data QR Terscan</h3>
              <button className="text-slate-500 hover:text-slate-700" onClick={() => setScannedQRData(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-auto">
{typeof scannedQRData === 'string' ? scannedQRData : JSON.stringify(scannedQRData, null, 2)}
              </pre>
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 font-medium"
                  onClick={() => {
                    const val = typeof scannedQRData === 'string' ? scannedQRData : (scannedQRData.tracking || scannedQRData.phone || scannedQRData.name || '');
                    setSearch(String(val));
                    setScannedQRData(null);
                  }}
                >
                  Cari di daftar paket
                </button>
                <button
                  className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-3 py-2 font-medium"
                  onClick={async () => {
                    const text = typeof scannedQRData === 'string' ? scannedQRData : JSON.stringify(scannedQRData);
                    try {
                      await navigator.clipboard.writeText(text);
                      alert('Data QR disalin ke clipboard');
                    } catch {}
                  }}
                >
                  Salin data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Dashboard Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
        <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-blue-100/60 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-indigo-200/50 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-600">Dashboard</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-slate-900">Halo, {firstName}</h1>
            <p className="mt-3 text-sm text-slate-500">Pantau performa operasional, pengiriman aktif, dan pertumbuhan member dalam satu tampilan terkurasi.</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {kpiExpanded && (
              <div className="flex items-center rounded-full border border-slate-200 bg-slate-100/70 p-1 backdrop-blur">
                {(['DAY', 'WEEK', 'MONTH', 'ALL'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={twMerge(
                      "px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
                      filter === f ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {f === 'DAY' ? 'Hari Ini' : f === 'WEEK' ? 'Minggu' : f === 'MONTH' ? 'Bulan' : 'Semua'}
                  </button>
                ))}
              </div>
            )}
            <button
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600 hover:shadow-md"
              onClick={() => setKpiExpanded(v => !v)}
            >
              {kpiExpanded ? "Sembunyikan KPI" : "Tampilkan KPI"}
            </button>
          </div>
        </div>
      </div>
      {kpiExpanded && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          <StatCard label="Paket Masuk" value={stats?.packagesIn || 0} icon={ArrowDownRight} color="bg-blue-600" sub="Periode dipilih" />
          <StatCard label="Paket Keluar" value={stats?.packagesOut || 0} icon={ArrowUpRight} color="bg-green-600" sub="Periode dipilih" />
          <StatCard label="Total Paket" value={stats?.inventoryActive || 0} icon={PackageIcon} color="bg-orange-600" sub="Inventaris Aktif" />
          <StatCard label="Member Aktif" value={stats?.membersActive || 0} icon={Users} color="bg-purple-600" sub="Langganan Aktif" />
          <StatCard label="Pendapatan Pengantaran" value={`Rp ${(stats?.revDelivery || 0).toLocaleString()}`} icon={Truck} color="bg-teal-700" />
          <StatCard label="Pendapatan Membership" value={`Rp ${(stats?.revMembership || 0).toLocaleString()}`} icon={Users} color="bg-indigo-700" />
          <StatCard label="Pendapatan Paket" value={`Rp ${(stats?.revPackage || 0).toLocaleString()}`} icon={Activity} color="bg-emerald-700" />
          <StatCard label="Total Pendapatan" value={`Rp ${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="bg-slate-900" sub="Total Kotor" />
        </div>
      )}

      {/* 2. PACKAGES & OVERVIEW SECTION */}
      <div className="space-y-6 pt-2">
        {/* Control Bar */}
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-blue-50/40" aria-hidden="true" />
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full rounded-xl border border-transparent bg-slate-100/70 py-2.5 pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              placeholder="Cari Nama, Unit, HP, AWB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Pencarian Paket"
            />
          </div>
          <div className="relative z-[1] flex w-full items-center justify-end gap-2 lg:w-auto">
            {/* Scan QR Button */}
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:from-purple-700 hover:to-purple-800"
            >
              <Scan className="w-4 h-4" /> Scan QR
            </button>
            <button
              type="button"
              onClick={handleSendPaymentLink}
              disabled={selectedPickupIds.length === 0}
              className={twMerge(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-sm transition-colors",
                selectedPickupIds.length > 0
                  ? "border-green-200 bg-green-50/80 text-green-700 hover:bg-green-100"
                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <Wallet className="w-4 h-4" /> Kirim Link Bayar ({selectedPickupIds.length})
            </button>
            <button
              type="button"
              onClick={handleBulkPickup}
              disabled={selectedPickupIds.length === 0}
              className={twMerge(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-sm transition-colors",
                selectedPickupIds.length > 0
                  ? "border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <PackageCheck className="w-4 h-4" /> Pickup Terpilih ({selectedPickupIds.length})
            </button>
            <button
              type="button"
              onClick={() => exportPackagesToCSV(filteredPackages)}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100"
            >
              <ArrowDownRight className="w-4 h-4" /> Ekspor CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition-transform hover:-translate-y-0.5 hover:shadow-xl active:scale-95 lg:w-auto"
            >
              <Plus className="w-4 h-4" /> Tambah Paket
            </button>
          </div>
        </div>
        {/* Data Tabel */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
          <div className="min-w-[1200px]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={allSelectableChecked}
                      onChange={(e) => handleSelectAllEligible(e.target.checked)}
                      aria-label="Pilih semua paket tersimpan"
                    />
                  </th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Masuk</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">AWB</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Penerima</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Lokasi</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Status Paket</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Status Pembayaran</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Harga/Biaya</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Notifikasi</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.length > 0 ? (
                  filteredPackages.map(pkg => {
                    const statusMeta = getPackageStatusMeta(pkg);
                    const notificationMeta = getNotificationMeta(pkg.notificationStatus);
                    const locationName = locationMap[pkg.locationId]?.name || '-';
                    const locationObj = locationMap[pkg.locationId];
                    const customer = customers.find(c => c.phoneNumber === pkg.recipientPhone);
                    const estimatedFee = locationObj ? PricingService.calculateFee(pkg, locationObj, customer) : 0;
                    const isPaid = pkg.feePaid > 0;
                    const displayedFee = isPaid ? pkg.feePaid : estimatedFee;
                    const paymentMeta = {
                      label: isPaid ? 'Sudah dibayar' : 'Belum dibayar',
                      className: isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100',
                      timestamp: formatDateTime(pkg.paymentTimestamp || (isPaid ? pkg.dates.picked : undefined))
                    };
                    const isSelectable = pkg.status === 'ARRIVED';
                    const isSelected = selectedPickupIds.includes(pkg.id);

                    return (
                      <tr
                        key={pkg.id}
                        className={twMerge(
                          "group cursor-pointer transition-colors hover:bg-blue-50/40 focus-within:bg-blue-50/60",
                          isSelected && "bg-blue-50/60"
                        )}
                        tabIndex={0}
                        aria-label={`Lihat detail paket ${pkg.trackingNumber}`}
                        onClick={() => setSelectedPkg(pkg)}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              togglePickupSelection(pkg.id);
                            }}
                            disabled={!isSelectable}
                            aria-label={`Pilih paket ${pkg.trackingNumber} untuk pickup massal`}
                          />
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center font-mono text-xs font-semibold text-slate-500">
                          <span className="inline-block min-w-[120px]">{formatDateTime(pkg.dates.arrived)}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-700 group-focus-within:text-blue-700">
                              {pkg.trackingNumber}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              {pkg.courier}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 group-focus-within:text-blue-700">
                              {pkg.recipientName}
                            </span>
                            <span className="text-xs text-slate-500">Unit {pkg.unitNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-medium text-slate-700">
                          <span className="inline-block min-w-[120px]">{locationName}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={twMerge('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', statusMeta.className)}>
                              {statusMeta.label}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {statusMeta.timestamp}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={twMerge('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', paymentMeta.className)}>
                              {paymentMeta.label}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {paymentMeta.timestamp || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-slate-800">
                            {formatCurrency(displayedFee)}
                          </span>
                          {!isPaid && estimatedFee > 0 && (
                            <span className="ml-2 text-[11px] text-slate-400">(estimasi)</span>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className={twMerge('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', notificationMeta.className)}>
                            {notificationMeta.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className={twMerge(actionButtonClass, 'text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700')}
                              onClick={(e) => { e.stopPropagation(); handlePickup(pkg); }}
                              disabled={pkg.status !== 'ARRIVED'}
                              title="Tandai sudah diambil"
                              aria-label="Tandai sudah diambil"
                            >
                              <PackageCheck className="h-4 w-4" />
                            </button>
                            <button
                              className={twMerge(actionButtonClass, 'text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700')}
                              onClick={(e) => { e.stopPropagation(); handleDestroy(pkg); }}
                              disabled={pkg.status === 'DESTROYED'}
                              title="Tandai hilang/dimusnahkan"
                              aria-label="Tandai hilang/dimusnahkan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              className={twMerge(actionButtonClass, 'text-blue-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700')}
                              onClick={(e) => { e.stopPropagation(); handleMarkPaid(pkg); }}
                              disabled={isPaid}
                              title="Tandai sudah bayar"
                              aria-label="Tandai sudah bayar"
                            >
                              <Wallet className="h-4 w-4" />
                            </button>
                            <button
                              className={twMerge(actionButtonClass, 'text-purple-600 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700')}
                              onClick={async (e) => { e.stopPropagation(); await handleResendNotification(pkg); }}
                              disabled={actionBusy === `resend-${pkg.id}`}
                              title="Kirim ulang notifikasi"
                              aria-label="Kirim ulang notifikasi"
                            >
                              {actionBusy === `resend-${pkg.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center text-slate-400">
                      <PackageIcon className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                      <p className="font-medium">Tidak ada paket ditemukan</p>
                      <p className="text-xs">Coba ubah pencarian atau filter</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. ADD PACKAGE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setIsAddModalOpen(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Tambah Paket</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500 transition-colors" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nomor Resi / AWB <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input required autoFocus className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.tracking} onChange={e => setFormData({...formData, tracking: e.target.value})} placeholder="Scan atau ketik nomor resi..." aria-label="Nomor Resi" />
                    <button type="button" onClick={() => setIsBarcodeScannerOpen(true)} className="p-2.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600" aria-label="Scan"><Camera className="w-5 h-5" /></button>
                  </div>
                </div>
                {getSelectedLocation()?.pricing.type === 'SIZE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Ukuran</label>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      {(['S','M','L'] as const).map(s => (
                        <button type="button" key={s} onClick={() => setFormData({...formData, size: s})} className={twMerge("flex-1 text-xs py-1.5 rounded font-bold transition-all", formData.size === s ? "bg-white shadow text-blue-600" : "text-slate-400 hover:text-slate-600")}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Foto Paket</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-blue-300 transition-all relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {formData.photo ? (
                      <img src={formData.photo} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mb-2 text-slate-300" />
                        <span className="text-xs font-medium">Klik untuk ambil foto</span>
                      </>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 relative">
                  <h4 className="text-xs font-bold text-blue-800 mb-4 uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4" /> Data Penerima</h4>
                  <div className="space-y-3 relative">
                    {/* Name with Suggestion Dropdown */}
                    <div className="relative">
                      <input 
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" 
                        value={formData.recipientName} 
                        onChange={e => handleNameInput(e.target.value)} 
                        onFocus={() => { if(formData.recipientName) setShowSuggestions(true) }}
                        placeholder="Ketik nama penerima..." 
                        aria-label="Nama Penerima"
                        required
                      />
                      {/* Dropdown Suggestions */}
                      {showSuggestions && filteredCustomers.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {filteredCustomers.map(c => (
                            <li 
                              key={c.id} 
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none"
                              onClick={() => selectCustomer(c)}
                            >
                              <div className="font-bold text-sm text-slate-800">{c.name}</div>
                              <div className="text-xs text-slate-500">Unit {c.unitNumber}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {showSuggestions && filteredCustomers.length === 0 && formData.recipientName && (
                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 p-2 text-xs text-slate-400 text-center">
                          Pelanggan baru
                        </div>
                      )}
                    </div>
                    {/* Unit Number - Locked if AutoFilled */}
                    <div>
                      <div className="flex justify-between">
                        <label className="block text-xs font-semibold text-blue-700 mb-1">Nomor Unit <span className="text-red-500">*</span></label>
                        {isAutoFilled && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <input 
                        readOnly={isAutoFilled}
                        className={twMerge(
                          "w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none transition-colors",
                          isAutoFilled 
                            ? "bg-slate-100 text-slate-500 cursor-not-allowed" 
                            : "focus:ring-blue-500 focus:border-blue-500 bg-white"
                        )} 
                        value={formData.unitNumber} 
                        onChange={e => setFormData({...formData, unitNumber: e.target.value})} 
                        placeholder="Contoh: A-101" 
                        aria-label="Nomor Unit"
                        required
                      />
                    </div>
                    {/* Phone - Locked if AutoFilled */}
                    <div>
                      <div className="flex justify-between">
                        <label className="block text-xs font-semibold text-blue-700 mb-1">Nomor WhatsApp <span className="text-red-500">*</span></label>
                        {isAutoFilled && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <input 
                        readOnly={isAutoFilled}
                        className={twMerge(
                          "w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none transition-colors", 
                          isAutoFilled 
                            ? "bg-slate-100 text-slate-500 cursor-not-allowed" 
                            : "focus:ring-blue-500 focus:border-blue-500 bg-white"
                        )} 
                        value={formData.recipientPhone} 
                        onChange={e => setFormData({...formData, recipientPhone: e.target.value})} 
                        placeholder="Contoh: 6281234567890" 
                        aria-label="Nomor WhatsApp"
                        required
                      />
                    </div>
                  </div>
                </div>
                {user.role === 'ADMIN' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Lokasi <span className="text-red-500">*</span></label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white" value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})} aria-label="Lokasi" required>
                      <option value="">Pilih Lokasi</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
                <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95">Simpan & Kirim Notif</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1b. Barcode Scanner Modal for AWB */}
      <SimpleScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(code) => {
          setFormData(prev => ({ ...prev, tracking: code }));
          setIsBarcodeScannerOpen(false);
        }}
        title="Scan AWB / Barcode"
      />

      {/* 1c. QR Scanner Modal for Pickup */}
      <SimpleScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={(text) => {
          // Cari paket berdasarkan hasil scan
          const code = (text || '').trim();
          if (!code) return;
          const lower = code.toLowerCase();
          
          const candidatePkgs = packages.filter(p => {
            const matches = p.trackingNumber.toLowerCase() === lower ||
              p.trackingNumber.toLowerCase().includes(lower) ||
              p.recipientPhone === code ||
              p.recipientName.toLowerCase().includes(lower);
            const locationOk = user.role === 'STAFF' ? p.locationId === user.locationId : true;
            return matches && locationOk && p.status === 'ARRIVED';
          });
          
          if (candidatePkgs.length > 0) {
            setSelectedPkg(candidatePkgs[0]);
          } else {
            alert('Paket tidak ditemukan untuk kode: ' + code);
          }
          setIsQRScannerOpen(false);
          loadData();
        }}
        title="Scan QR Pickup"
      />

      {/* 2. DETAIL & ACTION MODAL */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPkg(null); }}>
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPkg(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:text-red-500"
              aria-label="Tutup detail"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-5 py-5 space-y-4">
              <div className={twMerge('grid gap-4', selectedPkg.photo && isPhotoVisible ? 'md:grid-cols-[minmax(0,1fr)_220px]' : 'md:grid-cols-1')}>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Informasi Paket</p>
                      {selectedPkg.photo && (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
                          onClick={() => { setIsPhotoVisible(v => !v); setIsPhotoZoomed(false); }}
                        >
                          {isPhotoVisible ? 'Sembunyikan Foto' : 'Lihat Foto'}
                        </button>
                      )}
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Penerima</dt>
                        <dd className="mt-1 text-base font-bold text-slate-800">{selectedPkg.recipientName}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kontak</dt>
                        <dd className="mt-1 font-mono text-xs text-slate-600">{selectedPkg.recipientPhone}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Unit</dt>
                        <dd className="mt-1 font-semibold text-slate-800">{selectedPkg.unitNumber || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</dt>
                        <dd className="mt-1">
                          <span
                            className={twMerge(
                              'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                              selectedPkg.status === 'ARRIVED'
                                ? 'bg-blue-100 text-blue-700'
                                : selectedPkg.status === 'PICKED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            )}
                          >
                            {selectedPkg.status}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">AWB</dt>
                        <dd className="mt-1 font-mono text-xs text-slate-700">{selectedPkg.trackingNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kurir</dt>
                        <dd className="mt-1 font-semibold text-slate-800">{selectedPkg.courier}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ukuran</dt>
                        <dd className="mt-1 font-semibold text-slate-800">{selectedPkg.size}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lokasi</dt>
                        <dd className="mt-1 font-semibold text-slate-800">{locationMap[selectedPkg.locationId]?.name || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status Pembayaran</dt>
                        <dd className={twMerge('mt-1 font-semibold', selectedPkg.feePaid ? 'text-emerald-600' : 'text-amber-600')}>
                          {selectedPkg.feePaid ? 'Sudah dibayar' : 'Belum dibayar'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nominal Pembayaran</dt>
                        <dd className="mt-1 font-semibold text-slate-800">{selectedPkg.feePaid ? formatCurrency(selectedPkg.feePaid) : '-'}</dd>
                        {selectedPkg.paymentTimestamp && (
                          <p className="text-[11px] font-mono text-slate-400">{formatDateTime(selectedPkg.paymentTimestamp)}</p>
                        )}
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Masuk</dt>
                        <dd className="mt-1 font-mono text-xs text-slate-600">{formatDateTime(selectedPkg.dates.arrived)}</dd>
                      </div>
                      {selectedPkg.dates.picked && (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diambil</dt>
                          <dd className="mt-1 font-mono text-xs text-slate-600">{formatDateTime(selectedPkg.dates.picked)}</dd>
                        </div>
                      )}
                      {selectedPkg.dates.destroyed && (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Destroyed</dt>
                          <dd className="mt-1 font-mono text-xs text-slate-600">{formatDateTime(selectedPkg.dates.destroyed)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {selectedPkg.status === 'ARRIVED' && (() => {
                    const loc = locations.find(l => l.id === selectedPkg.locationId);
                    const cust = customers.find(c => c.phoneNumber === selectedPkg.recipientPhone);
                    const fee = loc ? PricingService.calculateFee(selectedPkg, loc, cust) : 0;
                    return (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">Estimasi Fee</p>
                        <p className="mt-1 text-xl font-bold text-orange-600">{formatCurrency(fee)}</p>
                        <p className="text-[11px] text-orange-500">{cust?.isMember ? 'Member aktif - tarif khusus' : 'Tarif standar penyimpanan'}</p>
                      </div>
                    );
                  })()}
                </div>

                {selectedPkg.photo && isPhotoVisible && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4">
                    <div className={twMerge('relative w-full overflow-hidden rounded-xl bg-slate-200', isPhotoZoomed ? 'h-64' : 'h-52')}>
                      <img
                        src={selectedPkg.photo}
                        alt="Foto Paket"
                        className={twMerge('h-full w-full transition-transform duration-300', isPhotoZoomed ? 'object-contain bg-slate-900' : 'object-cover')}
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-white shadow-lg">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                          onClick={() => setIsPhotoZoomed(z => !z)}
                          aria-label={isPhotoZoomed ? 'Perkecil foto' : 'Perbesar foto'}
                        >
                          {isPhotoZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="self-end text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-700"
                      onClick={() => { setIsPhotoVisible(false); setIsPhotoZoomed(false); }}
                    >
                      Tutup Foto
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons - Only Pickup Button */}
              {selectedPkg.status === 'ARRIVED' && (
                <button
                  onClick={() => handlePickup(selectedPkg)}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl"
                >
                  <PackageCheck className="h-6 w-6" />
                  <span className="text-lg">Ambil Paket</span>
                </button>
              )}
              {selectedPkg.status === 'PICKED' && (
                <div className="text-center py-4">
                  <p className="text-emerald-600 font-semibold text-lg">✓ Paket sudah diambil</p>
                  <p className="text-slate-500 text-sm mt-1">{formatDateTime(selectedPkg.dates.picked)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
