
"use client";
import { io, Socket } from "socket.io-client";

import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
const Webcam = dynamic(() => import("react-webcam"), { ssr: false });
import { Package, Loader2, Edit, Search, Plus, Trash2, ArrowUp, ArrowDown, QrCode, CheckSquare, Square, Eye, Send, AlertCircle, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
const QrBarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false });

interface PackageType {
  id: string;
  trackingCode: string;
  senderName: string;
  receiverName: string;
  status: string;
  size: string;
  location: {
    id?: string;
    name: string;
    pricing?: any;
  };
  locationId?: string;
  createdAt: string;
  updatedAt?: string;
  receiverPhone?: string;
  unitNumber?: string;
  payments?: { amount: number; status: string; updatedAt?: string }[];
}

type PackageSortKey = keyof PackageType | 'locationName';

export default function PackageTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [packageLoading, setPackageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: PackageSortKey; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
  
  // State for Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddScanner, setShowAddScanner] = useState(false);
  const [showRetrieveScanner, setShowRetrieveScanner] = useState(false);
  const [scannedPackage, setScannedPackage] = useState<PackageType | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailPackage, setDetailPackage] = useState<PackageType | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [imageZoom, setImageZoom] = useState<string | null>(null);
  
  const [newPkg, setNewPkg] = useState({
    trackingCode: "",
    senderName: "",
    receiverName: "",
    receiverPhone: "",
    locationId: "clwh2y3v8000008l8df0c0211",
    status: "ARRIVED",
    size: "S",
    customerId: undefined,
    photo: undefined,
  });
  // Webcam ref for react-webcam
  const webcamRef = useRef<any>(null);
  const [customersList, setCustomersList] = useState<{id:string,name:string,unitNumber:string,phoneNumber:string,locationId:string}[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Close image zoom overlay when any key is pressed
  useEffect(() => {
    if (!imageZoom) return;
    const handler = (e: KeyboardEvent) => {
      setImageZoom(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [imageZoom]);

  const shouldShowSize = (() => {
    try {
      const loc = locationsList.find(l => l.id === newPkg.locationId);
      return loc && loc.pricing && typeof loc.pricing === 'object' && ('S' in loc.pricing || 's' in loc.pricing);
    } catch (e) { return false; }
  })();
  const [editModal, setEditModal] = useState<{ isOpen: boolean; pkg: PackageType | null }>({ isOpen: false, pkg: null });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: "" });

  const handleAddScan = (decodedText: string) => {
    // Cek apakah resi/QR sudah ada di daftar paket
    if (packages.some(pkg => pkg.trackingCode === decodedText)) {
      toast.error('QR/resi sudah ada');
      setShowAddScanner(false);
      return;
    }
    setNewPkg((prev) => ({ ...prev, trackingCode: decodedText }));
    toast.success(`Scanned: ${decodedText}`);
    setShowAddScanner(false);
  };

  const handleRetrieveScan = async (decodedText: string) => {
    setShowRetrieveScanner(false);
    setPackageLoading(true);
    try {
      const res = await fetch(`/api/packages/track/${decodedText}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setScannedPackage(data.data);
      } else {
        toast.error(data.error || "Package not found.");
      }
    } catch (err) {
      toast.error("Error fetching package details.");
    } finally {
      setPackageLoading(false);
    }
  };

  const fetchPackages = async (silent = false) => {
    if (!silent) setPackageLoading(true);
    try {
      const response = await fetch("/api/packages");
      const data = await response.json();
      if (data.success) {
        setPackages(data.data);
      } else {
        if (!silent) toast.error(data.error || "Failed to load packages");
      }
    } catch (error) {
      if (!silent) toast.error("Network error loading packages.");
    } finally {
      if (!silent) setPackageLoading(false);
    }
  };

  const fetchLocationsList = async () => {
    try {
      const res = await fetch('/api/locations', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setLocationsList(data.data);
    } catch (err) {
      // ignore
    }
  };

  const fetchCustomersForSelect = async () => {
    try {
      const res = await fetch('/api/customers', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCustomersList(data.data.map((c: any) => ({ id: c.id, name: c.name, unitNumber: c.unitNumber, phoneNumber: c.phone, locationId: c.locationId })));
      }
    } catch (err) {
      // ignore
    }
  };

  // Realtime update via socket.io
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    fetchPackages();
    fetchCustomersForSelect();
    fetchLocationsList();
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setUserRole(JSON.parse(userData).role); } catch (e) { setUserRole(null); }
    }
    if (!socketRef.current) {
      socketRef.current = io("/api/socket", {
        path: "/api/socket",
        transports: ["websocket"],
      });
    }
    const socket = socketRef.current;
    socket.on("package-changed", () => fetchPackages(true));
    return () => {
      socket.off("package-changed");
    };
  }, []);

  const filteredPackages = useMemo(() => {
    return packages
      .filter(pkg => statusFilter === 'all' || pkg.status === statusFilter)
      .filter(pkg => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          pkg.trackingCode.toLowerCase().includes(q) ||
          (pkg.senderName || '').toLowerCase().includes(q) ||
          (pkg.receiverName || '').toLowerCase().includes(q) ||
          (pkg.unitNumber || '').toLowerCase().includes(q) ||
          (pkg.location?.name || '').toLowerCase().includes(q) ||
          (pkg.receiverPhone || '').toLowerCase().includes(q)
        );
      });
  }, [packages, searchQuery, statusFilter]);

  const sortedPackages = useMemo(() => {
    let sortableItems = [...filteredPackages];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        const aValue = key === 'locationName' ? a.location.name : a[key as keyof PackageType];
        const bValue = key === 'locationName' ? b.location.name : b[key as keyof PackageType];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredPackages, sortConfig]);

  const requestSort = (key: PackageSortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => { setPage(1); }, [searchQuery, sortConfig, statusFilter]);

  const paginatedPackages = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPackages.slice(start, start + pageSize);
  }, [sortedPackages, page, pageSize]);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // enforce photo mandatory on client-side
      if (!newPkg.photo) {
        toast.error("Foto paket wajib diambil atau diupload.");
        setSaving(false);
        return;
      }
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPkg),
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Package created successfully!");
        setShowAddModal(false);
        setNewPkg({ trackingCode: "", senderName: "JNE", receiverName: "", receiverPhone: "", locationId: "clwh2y3v8000008l8df0c0211", status: "ARRIVED", size: "S", customerId: undefined, photo: undefined });
        fetchPackages();
        // Emit event ke server untuk trigger dashboard update
        socketRef.current?.emit("package-changed");
      } else {
        toast.error(data.error || "Failed to create package.");
      }
    } catch (error) {
      toast.error("Network error. Could not create package.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRetrieval = async () => {
    if (!scannedPackage) return;
    setSaving(true);
    try {
        const response = await fetch(`/api/packages/${scannedPackage.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...scannedPackage, status: 'PICKED' }),
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok && data.success) {
          toast.success(`Package ${scannedPackage.trackingCode} marked as PICKED.`);
          setScannedPackage(null);
          fetchPackages();
          socketRef.current?.emit("package-changed");
        } else {
          toast.error(data.error || "Failed to update package status.");
        }
    } catch (error) {
        toast.error("Network error while updating package.");
    } finally {
        setSaving(false);
    }
  };

  const openEdit = (pkg: PackageType) => setEditModal({ isOpen: true, pkg: { ...pkg } });
  const closeEdit = () => setEditModal({ isOpen: false, pkg: null });
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.pkg) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/packages/${editModal.pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editModal.pkg),
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Package updated successfully!");
        closeEdit();
        fetchPackages();
        socketRef.current?.emit("package-changed");
      } else {
        toast.error(data.error || "Failed to update package.");
      }
    } catch (error) {
      toast.error("Network error. Could not update package.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, name: string) => setDeleteDialog({ isOpen: true, id, name });
  const doDelete = async () => {
    const id = deleteDialog.id;
    if (!id) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/packages/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Package deleted successfully!");
        setDeleteDialog({ isOpen: false, id: null, name: "" });
        fetchPackages();
        socketRef.current?.emit("package-changed");
      } else {
        toast.error(data.error || "Failed to delete package.");
      }
    } catch (error) {
      toast.error("Network error. Could not delete package.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => ({ "ARRIVED": "bg-blue-100 text-blue-800", "PICKED": "bg-green-100 text-green-800", "DESTROYED": "bg-red-100 text-red-800" }[status] || "bg-gray-100 text-gray-800");
  const getStatusLabel = (status: string) => ({ "ARRIVED": "Simpan", "PICKED": "Diambil", "DESTROYED": "Dimusnahkan" }[status] || status);
  const formatRupiah = (val?: number) => (typeof val === 'number' ? `Rp ${val.toLocaleString('id-ID')}` : '-');
  const SortableHeader = ({ sortKey, children }: { sortKey: PackageSortKey, children: React.ReactNode }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button className="flex items-center gap-1" onClick={() => requestSort(sortKey)}>
        {children}
        {sortConfig?.key === sortKey && (
          sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        )}
      </button>
    </th>
  );

  // Actions: mark picked / destroyed
  const markAsPicked = async (pkgId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/packages/${pkgId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PICKED' }), credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) { toast.success('Package marked as PICKED'); fetchPackages(); } else toast.error(data.error || 'Failed to mark picked');
    } catch (e) { toast.error('Network error'); }
    setSaving(false);
  };

  const markAsDestroyed = async (pkgId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/packages/${pkgId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DESTROYED' }), credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) { toast.success('Package marked as DESTROYED'); fetchPackages(); } else toast.error(data.error || 'Failed to mark destroyed');
    } catch (e) { toast.error('Network error'); }
    setSaving(false);
  };

  const resendNotification = async (pkgId: string) => {
    setSaving(true);
    const t = toast.loading('Resending notification...');
    try {
      const res = await fetch(`/api/packages/${pkgId}/resend`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) toast.success(data.message || 'Notification resent');
      else toast.error(data.error || 'Failed to resend notification');
      fetchPackages();
    } catch (e) {
      toast.error('Network error while resending.');
    } finally {
      toast.dismiss(t);
      setSaving(false);
    }
  };

  // Calculate fee based on location pricing schemes
  // Hitung biaya progresif kuantitas per penerima per lokasi
  const calculateFee = (pkg: PackageType): number => {
    const pricing = (pkg as any).location?.pricing;
    if (!pricing) return 0;
    const created = new Date(pkg.createdAt);
    const out = pkg.status === 'PICKED' ? new Date(pkg.updatedAt || pkg.createdAt) : new Date();
    const days = Math.max(1, Math.ceil((out.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));

    if ('S' in pricing && 'M' in pricing && 'L' in pricing) {
      return pricing[pkg.size] || 0;
    } else if ('flat' in pricing) {
      return (pricing.flat || 0) * days;
    } else if ('firstDay' in pricing && 'nextDay' in pricing) {
      // Hari pertama: firstDay, hari ke-2 dst: nextDay
      if (days <= 1) return pricing.firstDay || 0;
      return (pricing.firstDay || 0) + (pricing.nextDay || 0) * (days - 1);
    } else if ('firstQty' in pricing && 'nextQty' in pricing) {
      // Hitung urutan paket untuk penerima di lokasi yang sama, status belum diambil
      const sameReceiverPkgs = packages
        .filter(p =>
          p.location?.id === pkg.location?.id &&
          p.receiverName === pkg.receiverName &&
          p.receiverPhone === pkg.receiverPhone &&
          p.status !== 'PICKED'
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const idx = sameReceiverPkgs.findIndex(p => p.id === pkg.id);
      if (idx === 0) return pricing.firstQty || 0;
      return pricing.nextQty || 0;
    }
    return 0;
  };

  const markAsLunas = async (pkgId: string) => {
    setSaving(true);
    try {
      const pkg = packages.find(p => p.id === pkgId);
      const amount = pkg ? calculateFee(pkg) : 0;
      const locationId = (pkg as any)?.locationId || (pkg as any)?.location?.id;

      if (!locationId) {
        toast.error('Gagal menandai lunas: lokasi tidak ditemukan');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkgId,
          amount,
          status: 'COMPLETED',
          method: 'ADMIN',
          locationId,
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Package marked as Lunas');
        // Optimistically update detail modal payments so UI refreshes
        setDetailPackage(prev => prev && prev.id === pkgId ? {
          ...prev,
          payments: [{ amount, status: 'COMPLETED', updatedAt: new Date().toISOString() }, ...(prev.payments || [])],
        } : prev);
        fetchPackages();
      } else toast.error(data.error || 'Failed to mark lunas');
    } catch (e) {
      console.error(e);
      toast.error('Network error');
    }
    setSaving(false);
  };

  const togglePackageSelection = (pkgId: string) => {
    setSelectedPackages(prev => prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]);
  };

  const toggleSelectAll = () => {
    if (selectedPackages.length === paginatedPackages.length) {
      setSelectedPackages([]);
    } else {
      setSelectedPackages(paginatedPackages.map(p => p.id));
    }
  };

  const bulkMarkAsPicked = async () => {
    if (selectedPackages.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(selectedPackages.map(id => 
        fetch(`/api/packages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PICKED' }), credentials: 'include' })
      ));
      toast.success(`${selectedPackages.length} paket ditandai diambil`);
      setSelectedPackages([]);
      fetchPackages();
    } catch (e) { toast.error('Network error'); }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
      <div className="p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Package Management</h2>
          <p className="text-sm text-gray-600 mt-1">Kelola paket masuk dan keluar ({sortedPackages.length} packages)</p>
        </div>
        <div className="w-full md:w-auto flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search resi, nama, unit, lokasi, atau no. telepon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:w-48 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
            <option value="all">All Status</option>
            <option value="ARRIVED">Arrived</option>
            <option value="PICKED">Picked</option>
            <option value="DESTROYED">Destroyed</option>
          </select>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition" onClick={() => setShowRetrieveScanner(true)}>
                <QrCode className="h-3.5 w-3.5" />
                Ambil Paket
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition" onClick={() => setShowAddModal(true)}>
                <Plus className="h-3.5 w-3.5" />
                Input Paket
            </button>
        </div>
      </div>
      
      <div className="px-6 pb-6 overflow-x-auto">
        {packageLoading && <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}
        {!packageLoading && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={toggleSelectAll} className="hover:text-gray-700">
                    {selectedPackages.length === paginatedPackages.length && paginatedPackages.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Masuk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penerima</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keluar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Bayar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPackages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{searchQuery || statusFilter !== 'all' ? "No packages found matching your criteria" : "Belum ada paket"}</p>
                    {!searchQuery && statusFilter === 'all' && (<p className="text-sm mt-1">Klik "Input Paket" untuk menambah</p>)}
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((pkg) => {
                  const payment = pkg.payments?.[0];
                  const showSize = ((pkg as any).location?.pricing && (('S' in (pkg as any).location.pricing) || ('s' in (pkg as any).location.pricing)));
                  const isSelected = selectedPackages.includes(pkg.id);
                  return (
                    <tr key={pkg.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) setDetailPackage(pkg); }}>
                      <td className="px-4 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => togglePackageSelection(pkg.id)}
                          className={`hover:text-gray-700 ${pkg.status === 'PICKED' || pkg.status === 'DESTROYED' ? 'opacity-40 cursor-not-allowed' : ''}`}
                          disabled={pkg.status === 'PICKED' || pkg.status === 'DESTROYED'}
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-sm font-medium text-gray-900">{pkg.trackingCode}</div>
                        {showSize && (
                          <div className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Size {pkg.size}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-green-600 font-medium">{new Date(pkg.createdAt).toLocaleString()}</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-gray-900">{pkg.receiverName}{pkg.unitNumber ? ` • ${pkg.unitNumber}` : ''}</div>
                        <div className="text-xs text-gray-500 mt-1">{pkg.receiverPhone || '-'}</div>
                      </td>

                      <td className="px-4 py-3 align-top"><div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pkg.status)}`}>{getStatusLabel(pkg.status)}</div></td>

                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-red-600">{pkg.status === 'PICKED' ? new Date(pkg.updatedAt || pkg.createdAt).toLocaleString() : '-'}</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {payment ? (
                          <div>
                            <div className={`inline-flex px-2 py-0.5 rounded-full text-xs ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {payment.status === 'COMPLETED' ? 'Lunas' : payment.status}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{payment.updatedAt ? new Date(payment.updatedAt as any).toLocaleString() : '-'}</div>
                          </div>
                        ) : (
                          <div className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Belum bayar</div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {payment ? (
                          <div className="text-sm font-medium text-gray-900">{formatRupiah(payment.amount)}</div>
                        ) : (
                          (() => {
                            const pricing = (pkg as any).location?.pricing;
                            if (!pricing) return '-';
                            // Calculate fee by scheme
                            const created = new Date(pkg.createdAt);
                            const out = pkg.status === 'PICKED' ? new Date(pkg.updatedAt || pkg.createdAt) : new Date();
                            const days = Math.max(1, Math.ceil((out.getTime() - created.getTime()) / (1000*60*60*24)));
                            if ('S' in pricing && 'M' in pricing && 'L' in pricing) {
                              // flat_by_size
                              return <div className="text-sm text-gray-700">{formatRupiah(pricing[pkg.size])}</div>;
                            } else if ('flat' in pricing) {
                              // flat_per_day
                              return <div className="text-sm text-gray-700">{formatRupiah(pricing.flat * days)}</div>;
                            } else if ('firstDay' in pricing && 'nextDay' in pricing) {
                              // progressive_days: hari pertama firstDay, hari ke-2 dst nextDay
                              let fee = 0;
                              if (days <= 1) fee = pricing.firstDay;
                              else fee = pricing.firstDay + pricing.nextDay * (days-1);
                              return <div className="text-sm text-gray-700">{formatRupiah(fee)}</div>;
                            } else if ('firstQty' in pricing && 'nextQty' in pricing) {
                              // progressive_qty: tampilkan sesuai urutan paket untuk penerima di lokasi ini
                              const sameReceiverPkgs = paginatedPackages
                                .filter(p =>
                                  p.location?.id === pkg.location?.id &&
                                  p.receiverName === pkg.receiverName &&
                                  p.receiverPhone === pkg.receiverPhone &&
                                  p.status !== 'PICKED'
                                )
                                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                              const idx = sameReceiverPkgs.findIndex(p => p.id === pkg.id);
                              const fee = idx === 0 ? pricing.firstQty : pricing.nextQty;
                              return <div className="text-sm text-gray-700">{formatRupiah(fee)}</div>;
                            }
                            return '-';
                          })()
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button className="p-1.5 hover:bg-blue-50 rounded" onClick={() => setDetailPackage(pkg)} title="Detail">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </button>
                          {pkg.status === 'ARRIVED' && (
                            <button
                              className="p-1.5 hover:bg-green-50 rounded disabled:opacity-50"
                              onClick={() => markAsPicked(pkg.id)}
                              title="Diambil"
                              disabled={(!pkg.payments || pkg.payments.length === 0 || pkg.payments[0].status !== 'COMPLETED')}
                            >
                              <CheckSquare className="h-4 w-4 text-green-600" />
                            </button>
                          )}
                          {(!pkg.payments || pkg.payments.length === 0 || pkg.payments[0].status !== 'COMPLETED') && (
                            <button className="p-1.5 hover:bg-green-50 rounded" onClick={() => markAsLunas(pkg.id)} title="Lunas">
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                            </button>
                          )}
                          <button className="p-1.5 hover:bg-gray-50 rounded" onClick={() => resendNotification(pkg.id)} title="Resend Notifikasi">
                            <Send className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-red-50 rounded disabled:opacity-50"
                            onClick={() => markAsDestroyed(pkg.id)}
                            title="Dimusnahkan"
                            disabled={pkg.status !== 'ARRIVED'}
                          >
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-4">
          {selectedPackages.length > 0 && (() => {
            // Ambil data paket terpilih
            const selectedPkgs = paginatedPackages.filter(p => selectedPackages.includes(p.id));
            // Cek eligibility: semua harus ARRIVED dan sudah lunas
            const allEligible = selectedPkgs.every(pkg => pkg.status === 'ARRIVED' && pkg.payments && pkg.payments[0]?.status === 'COMPLETED');
            // Hitung total biaya sesuai skema progresif
            let totalFee = 0;
            // Untuk progressive_qty, urutkan per receiver di lokasi
            const grouped = {} as Record<string, PackageType[]>;
            selectedPkgs.forEach(pkg => {
              const key = `${pkg.location?.id}|${pkg.receiverName}|${pkg.receiverPhone}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(pkg);
            });
            Object.values(grouped).forEach(pkgs => {
              // Urutkan by createdAt
              pkgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              pkgs.forEach((pkg, idx) => {
                const pricing = pkg.location?.pricing;
                const created = new Date(pkg.createdAt);
                const out = pkg.status === 'PICKED' ? new Date(pkg.updatedAt || pkg.createdAt) : new Date();
                const days = Math.max(1, Math.ceil((out.getTime() - created.getTime()) / (1000*60*60*24)));
                if (!pricing) return;
                if ('S' in pricing && 'M' in pricing && 'L' in pricing) {
                  totalFee += pricing[pkg.size] || 0;
                } else if ('flat' in pricing) {
                  totalFee += (pricing.flat || 0) * days;
                } else if ('firstDay' in pricing && 'nextDay' in pricing) {
                  if (days <= 1) totalFee += pricing.firstDay || 0;
                  else totalFee += (pricing.firstDay || 0) + (pricing.nextDay || 0) * (days - 1);
                } else if ('firstQty' in pricing && 'nextQty' in pricing) {
                  totalFee += idx === 0 ? pricing.firstQty || 0 : pricing.nextQty || 0;
                }
              });
            });
            return (
              <div className="fixed left-0 right-0 bottom-0 z-50 flex justify-center pointer-events-none">
                <div className="flex flex-col gap-1 items-start bg-white border-t border-gray-300 shadow-lg rounded-t px-4 py-3 m-2 pointer-events-auto max-w-md w-full">
                  <span className="text-sm text-gray-600">{selectedPackages.length} terpilih</span>
                  <span className="text-sm text-gray-700 font-semibold">Total biaya: {formatRupiah(totalFee)}</span>
                  {!allEligible && <span className="text-xs text-red-500">Semua paket harus status ARRIVED &amp; sudah lunas</span>}
                  <button
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm flex items-center gap-1 disabled:bg-gray-300 disabled:text-gray-500"
                    onClick={bulkMarkAsPicked}
                    disabled={!allEligible}
                  >
                    <CheckSquare className="h-4 w-4" /> Tandai Diambil
                  </button>
                </div>
              </div>
            );
          })()}
          <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Show:</label>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white">
            {[10, 20, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
          <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>
        <Pagination page={page} pageSize={pageSize} total={sortedPackages.length} onPageChange={(p) => setPage(p)} />
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Paket">
        <form onSubmit={handleAddPackage} className="space-y-4 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm h-10" placeholder="Nomor Resi" value={newPkg.trackingCode} onChange={(e) => setNewPkg({ ...newPkg, trackingCode: e.target.value })} required />
            <button type="button" className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2" onClick={() => setShowAddScanner(true)}>
              <QrCode className="h-4 w-4" /> Scan
            </button>
            {showAddScanner && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-4 max-w-md w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">Scan Barcode/QR</span>
                    <button onClick={() => setShowAddScanner(false)} className="text-gray-500 hover:text-red-600"><span aria-hidden>X</span></button>
                  </div>
                  <QrBarcodeScanner
                    onUpdate={(err, result) => {
                      if (result) {
                        handleAddScan(result.text);
                        setShowAddScanner(false);
                      }
                    }}
                    facingMode="environment"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Search Customer (name / unit)</label>
              <input
                list="customers-datalist"
                className="border rounded-lg px-3 py-2 text-sm h-10 w-full"
                placeholder="Cari nama atau unit..."
                onChange={(e) => {
                  const val = e.target.value;
                  // try to find by 'name - unit' or name
                  const found = customersList.find(c => `${c.name} - ${c.unitNumber}` === val || c.name === val || c.unitNumber === val);
                  if (found) {
                    setNewPkg({ ...newPkg, receiverName: found.name, receiverPhone: found.phoneNumber, locationId: found.locationId, customerId: found.id });
                  } else {
                    setNewPkg({ ...newPkg, receiverName: val, customerId: undefined });
                  }
                }}
                value={newPkg.receiverName}
                required
              />
              <datalist id="customers-datalist">
                {customersList.map(c => <option key={c.id} value={`${c.name} - ${c.unitNumber}`}>{c.phoneNumber}</option>)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-gray-500">Nomor HP Penerima</label>
              <input
                className="border rounded-lg px-3 py-2 text-sm h-10"
                placeholder="628..."
                value={newPkg.receiverPhone}
                onChange={(e) => setNewPkg({ ...newPkg, receiverPhone: e.target.value })}
                required
                readOnly={userRole !== 'ADMIN' && !!newPkg.customerId}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm h-10" value={newPkg.senderName} onChange={(e) => setNewPkg({ ...newPkg, senderName: e.target.value })} required>
              <option value="" disabled>Pilih Kurir</option>
              {['JNE', 'J&T Express', 'SiCepat', 'Anteraja', 'TIKI', 'Pos Indonesia', 'Ninja Xpress', 'Lion Parcel', 'GoSend', 'GrabExpress'].map(courier => (<option key={courier} value={courier}>{courier}</option>))}
            </select>

            {userRole === 'ADMIN' ? (
              <div>
                <label className="text-xs text-gray-500">Lokasi</label>
                <select className="border rounded-lg px-3 py-2 text-sm h-10 w-full" value={newPkg.locationId} onChange={(e) => setNewPkg({ ...newPkg, locationId: e.target.value })} required>
                  <option value="" disabled>Pilih Lokasi</option>
                  {locationsList.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500">Lokasi</label>
                <input className="border rounded-lg px-3 py-2 text-sm h-10 w-full bg-gray-50" value={locationsList.find(l => l.id === newPkg.locationId)?.name || ''} readOnly />
              </div>
            )}
          </div>
          {shouldShowSize && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">Size</label>
              <select className="border rounded-lg px-3 py-2 text-sm h-10 w-full" value={newPkg.size} onChange={(e) => setNewPkg({ ...newPkg, size: e.target.value })}>
                {['S', 'M', 'L'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

            <div className="mt-2">
              <label className="text-xs text-gray-500">Foto Paket (wajib)</label>
              <div className="flex gap-2 items-center">
                <button type="button" className="px-3 py-2 border rounded-lg flex items-center gap-2" onClick={() => setCameraOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h2l2-3h8l2 3h2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
                  Foto / Kamera
                </button>
                {newPkg.photo && <img src={newPkg.photo} className="w-20 h-20 object-cover rounded" alt="preview" />}
              </div>
            </div>

            {cameraOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-4 max-w-md w-full">
                  <div className="text-sm text-gray-600 mb-2">Arahkan kamera ke paket</div>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-64 bg-black rounded"
                    videoConstraints={{ facingMode: "environment" }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="button" className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={() => {
                      if (webcamRef.current && webcamRef.current.getScreenshot) {
                        const data = webcamRef.current.getScreenshot();
                        if (data) {
                          setNewPkg({ ...newPkg, photo: data });
                          toast.success('Foto berhasil diambil');
                        } else {
                          toast.error('Gagal mengambil foto');
                        }
                      } else {
                        toast.error('Webcam tidak siap');
                      }
                      setCameraOpen(false);
                    }}>Capture</button>
                    <button type="button" className="px-3 py-2 border rounded" onClick={() => setCameraOpen(false)}>Batal</button>
                  </div>
                  {/* ref webcam dideklarasikan di atas, bukan di dalam JSX */}
                </div>
              </div>
            )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-4 py-2 border rounded-lg" onClick={() => setShowAddModal(false)} disabled={saving}>Batal</button>
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={scannedPackage !== null} onClose={() => setScannedPackage(null)} title="Detail Paket">
        {scannedPackage && (
            <div className="space-y-4 p-2">
                <div><strong>No. Resi:</strong> {scannedPackage.trackingCode}</div>
                <div><strong>Penerima:</strong> {scannedPackage.receiverName}</div>
                <div><strong>Pengirim:</strong> {scannedPackage.senderName}</div>
                <div><strong>Status Saat Ini:</strong> <span className={`font-semibold ${getStatusColor(scannedPackage.status)}`}>{scannedPackage.status}</span></div>
                {scannedPackage.status === 'ARRIVED' ? (
                    <div className="pt-4 border-t mt-4">
                        <button onClick={handleConfirmRetrieval} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                            {saving ? <><Loader2 className="h-4 w-4 animate-spin"/> Mengkonfirmasi...</> : "Konfirmasi Pengambilan"}
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-red-600 pt-4 border-t mt-4">Paket ini tidak bisa diambil karena statusnya bukan 'ARRIVED'.</p>
                )}
            </div>
        )}
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={closeEdit} title="Edit Paket">
        {editModal.pkg && ( <form onSubmit={saveEdit} className="space-y-3 p-1">{/* Edit form fields */} <div className="flex justify-end gap-2 pt-2"><button type="button" className="px-4 py-2 border rounded-lg" onClick={closeEdit} disabled={saving}>Batal</button><button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div></form>)}
      </Modal>

      <Modal isOpen={detailPackage !== null} onClose={() => setDetailPackage(null)} title="Detail Paket" size="lg">
        {detailPackage && (
          <div className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left column - main details */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">No. Resi</label>
                  <div className="text-sm font-medium text-gray-900">{detailPackage.trackingCode}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <div className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(detailPackage.status)}`}>{getStatusLabel(detailPackage.status)}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Pengirim</label>
                  <div className="text-sm text-gray-900">{detailPackage.senderName}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Penerima</label>
                  <div className="text-sm text-gray-900">{detailPackage.receiverName}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Nomor HP</label>
                  <div className="text-sm text-gray-900">{detailPackage.receiverPhone || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Unit</label>
                  <div className="text-sm text-gray-900">{detailPackage.unitNumber || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Lokasi</label>
                  <div className="text-sm text-gray-900">{detailPackage.location.name}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Size</label>
                  <div className="text-sm text-gray-900">{detailPackage.size}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Waktu Masuk</label>
                  <div className="text-sm text-green-600">{new Date(detailPackage.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Waktu Keluar</label>
                  <div className="text-sm text-red-600">{detailPackage.status === 'PICKED' ? new Date(detailPackage.updatedAt || detailPackage.createdAt).toLocaleString() : '-'}</div>
                </div>
              </div>

              {/* Right column - payment + photo (thumbnail) */}
              <div>
                <div className="mb-3">
                  <label className="text-xs text-gray-500">Status Pembayaran</label>
                  <div className="text-sm">
                    {detailPackage.payments && detailPackage.payments.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${detailPackage.payments[0].status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {detailPackage.payments[0].status === 'COMPLETED' ? 'Lunas' : detailPackage.payments[0].status}
                        </span>
                        <span className="text-sm font-medium">{formatRupiah(detailPackage.payments[0].amount)}</span>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Belum bayar</span>
                    )}
                  </div>
                </div>

                {(detailPackage as any).photo && (
                  <div>
                    <label className="text-xs text-gray-500">Foto Paket</label>
                    <div className="mt-2">
                      <button onClick={(e) => { e.stopPropagation(); setImageZoom((detailPackage as any).photo); }} className="inline-flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Tampilkan Gambar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons at the bottom */}
            <div className="border-t mt-6 pt-4">
              <div className="flex gap-2 flex-wrap">
                {detailPackage.status === 'ARRIVED' && (
                  <button onClick={() => markAsPicked(detailPackage.id)} disabled={saving} className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1">
                    <CheckSquare className="h-4 w-4" />
                    Tandai Diambil
                  </button>
                )}
                {(!detailPackage.payments || detailPackage.payments.length === 0 || detailPackage.payments[0].status !== 'COMPLETED') && (
                  <button onClick={() => markAsLunas(detailPackage.id)} disabled={saving} className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Tandai Lunas
                  </button>
                )}
                <button onClick={() => markAsDestroyed(detailPackage.id)} disabled={saving} className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Dimusnahkan
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null, name: "" })}
        onConfirm={doDelete}
        title="Hapus Paket"
        message={`Yakin menghapus paket ${deleteDialog.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        loading={saving}
      />
      {showRetrieveScanner && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Scan QR Ambil</span>
              <button onClick={() => setShowRetrieveScanner(false)} className="text-gray-500 hover:text-red-600"><span aria-hidden>X</span></button>
            </div>
            <QrBarcodeScanner
              onUpdate={(err, result) => {
                if (result) {
                  handleRetrieveScan(result.text);
                  setShowRetrieveScanner(false);
                }
              }}
              facingMode="environment"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
      {imageZoom && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4" onClick={() => setImageZoom(null)}>
          <img src={imageZoom} alt="zoom" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// Image zoom overlay (rendered at module bottom)
export function ImageZoomOverlay({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <img src={src} alt="zoom" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}