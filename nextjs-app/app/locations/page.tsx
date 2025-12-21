"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
// Ambil biaya terakhir yang sudah dibayar dan diambil untuk lokasi tertentu
function useLatestFee(locationId: string) {
  return useSWR(locationId ? `/api/locations-latest-fee?locationId=${locationId}` : null, async (url) => {
    const res = await fetch(url);
    const data = await res.json();
    return data.success ? data.data : null;
  }, { refreshInterval: 5000 });
}
import { useRouter } from "next/navigation";
import { MapPin, Loader2, Plus, Edit, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";

interface Location {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  pricing: any;
  enableDelivery: boolean;
  deliveryFee: number;
  enableMembership?: boolean;
  membershipFee?: number;
}

type SortKey = keyof Location;

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9; // 3x3 grid

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    locationId: string | null;
    locationName: string;
  }>({ isOpen: false, locationId: null, locationName: "" });
  const [deleting, setDeleting] = useState(false);
  const [locationModal, setLocationModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    location: Location | null;
  }>({ isOpen: false, mode: "add", location: null });
  const [formData, setFormData] = useState({
    name: "",
    enableDelivery: false,
    deliveryFee: 0,
    pricingScheme: "flat_by_size", // default
    pricing: { S: 5000, M: 7000, L: 10000 },
    gracePeriod: 0,
    enableMembership: false,
    membershipFee: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    fetchLocations();
  }, [router]);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      } else {
        throw new Error(data.error || "Failed to load locations");
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("API error. Loading dummy data for Locations.");
      const dummyLocations: Location[] = Array.from({ length: 8 }).map((_, i) => ({
        id: `dummy-loc-${i}`,
        name: `PickPoint Branch ${String.fromCharCode(65 + i)}`,
        code: `PP-${String.fromCharCode(65 + i)}001`,
        address: `${i + 1}00 Dummy Street, Jakarta`,
        phone: `0812345678${i}`,
        enableDelivery: i % 2 === 0,
        deliveryFee: 10000,
        pricing: { S: 5000, M: 7000, L: 10000 },
        createdAt: new Date().toISOString(),
      }));
      setLocations(dummyLocations);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const sortedLocations = useMemo(() => {
    let sortableItems = [...filteredLocations];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredLocations, sortConfig]);
  
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortConfig]);


  const handleAddClick = () => {
    setFormData({
      name: "",
      enableDelivery: false,
      deliveryFee: 0,
      pricingScheme: "flat_by_size",
      pricing: { S: 5000, M: 7000, L: 10000 },
      gracePeriod: 0,
      enableMembership: false,
      membershipFee: 0,
    });
    setLocationModal({ isOpen: true, mode: "add", location: null });
  };

  const handleEditClick = (location: Location) => {
    // Deteksi skema dari pricing. If pricing is stored as JSON string, parse it first.
    let pricingObj: any = location.pricing;
    if (typeof pricingObj === 'string') {
      try { pricingObj = JSON.parse(pricingObj); } catch (e) { pricingObj = {}; }
    }
    let pricingScheme = "flat_by_size";
    if (typeof pricingObj === "object" && pricingObj !== null) {
      const keys = Object.keys(pricingObj);
      if (keys.includes("S") && keys.includes("M") && keys.includes("L")) {
        pricingScheme = "flat_by_size";
      } else if (keys.includes("flat")) {
        pricingScheme = "flat_per_day";
      } else if (keys.includes("firstDay") || keys.includes("nextDay") || keys.includes("progressive_days")) {
        pricingScheme = "progressive_days";
      } else if (keys.includes("firstQty") || keys.includes("nextQty") || keys.includes("progressive_qty")) {
        pricingScheme = "progressive_qty";
      }
    }
    setFormData({
      name: location.name,
      enableDelivery: location.enableDelivery,
      deliveryFee: location.deliveryFee,
      pricingScheme,
      pricing: pricingObj,
      gracePeriod: location.gracePeriod ?? 0,
      enableMembership: location.enableMembership ?? false,
      membershipFee: location.membershipFee ?? 0,
    });
    setLocationModal({ isOpen: true, mode: "edit", location });
  };

  const handleModalClose = () => {
    setLocationModal({ isOpen: false, mode: "add", location: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url =
        locationModal.mode === "add"
          ? "/api/locations"
          : `/api/locations/${locationModal.location?.id}`;
      const method = locationModal.mode === "add" ? "POST" : "PUT";

      // Sanitize payload: Prisma Location model expects fields: name, pricing (Json), enableDelivery, deliveryFee, gracePeriod
      const payload: any = {
        name: formData.name,
        pricing: formData.pricing,
        enableDelivery: formData.enableDelivery,
        deliveryFee: formData.deliveryFee,
        gracePeriod: formData.gracePeriod,
        enableMembership: formData.enableMembership,
        membershipFee: formData.membershipFee,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Location ${locationModal.mode === "add" ? "created" : "updated"} successfully`
        );
        fetchLocations();
        handleModalClose();
      } else {
        toast.error(data.error || "Failed to save location");
      }
    } catch (error) {
      toast.error("Network error saving location");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (locationId: string, locationName: string) => {
    setDeleteDialog({ isOpen: true, locationId, locationName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.locationId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/locations/${deleteDialog.locationId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Location deleted successfully");
        setLocations(locations.filter((l) => l.id !== deleteDialog.locationId));
        setDeleteDialog({ isOpen: false, locationId: null, locationName: "" });
      } else {
        toast.error(data.error || "Failed to delete location");
      }
    } catch (error) {
      toast.error("Network error deleting location");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedLocations = sortedLocations.slice(start, end);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Location Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Kelola lokasi dan pricing ({sortedLocations.length} locations)
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Tambah Lokasi
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="sort" className="text-sm font-medium text-gray-600">Sort by:</label>
          <select
            id="sort"
            className="w-full md:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            onChange={(e) => {
              const [key, direction] = e.target.value.split('-') as [SortKey, 'ascending' | 'descending'];
              setSortConfig({ key, direction });
            }}
            value={`${sortConfig.key}-${sortConfig.direction}`}
          >
            <option value="name-ascending">Name (A-Z)</option>
            <option value="name-descending">Name (Z-A)</option>
            <option value="code-ascending">Code (A-Z)</option>
            <option value="code-descending">Code (Z-A)</option>
          </select>
        </div>
      </div>

      <div>
        {sortedLocations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50 text-gray-400" />
            <p className="text-gray-500">
              {searchQuery
                ? "No locations found matching your search"
                : "Belum ada lokasi"}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-400 mt-1">
                Klik "Tambah Lokasi" untuk menambah
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedLocations.map((location) => (
            <div
              key={location.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {location.name}
                    </h3>
                    <p className="text-sm text-gray-500">Code: {location.code}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Address:</span> {location.address}
                </p>
                {location.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {location.phone}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-gray-600">Add-ons:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${location.enableDelivery ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    Pengantaran {location.enableDelivery ? `(Rp ${location.deliveryFee.toLocaleString()})` : 'Nonaktif'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${location.enableMembership ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                    Membership {location.enableMembership ? `(Rp ${Number(location.membershipFee || 0).toLocaleString()})` : 'Nonaktif'}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-gray-600">Skema:</span>
                  {(() => {
                    const p: any = typeof location.pricing === 'string' ? (() => { try { return JSON.parse(location.pricing); } catch { return {}; } })() : location.pricing;
                    if (p && typeof p === 'object') {
                      if ('S' in p && 'M' in p && 'L' in p) {
                        return (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Flat by Size: S {p.S?.toLocaleString?.() || p.S}, M {p.M?.toLocaleString?.() || p.M}, L {p.L?.toLocaleString?.() || p.L}</span>
                        );
                      }
                      if ('flat' in p) {
                        return (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Flat per Hari: Rp {p.flat?.toLocaleString?.() || p.flat} / hari</span>
                        );
                      }
                      if ('firstDay' in p || 'nextDay' in p) {
                        return (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Progresif Hari: Hari pertama Rp {p.firstDay?.toLocaleString?.() || p.firstDay}, berikutnya Rp {p.nextDay?.toLocaleString?.() || p.nextDay}</span>
                        );
                      }
                      if ('firstQty' in p || 'nextQty' in p) {
                        return (
                          <span className="inline-flex flex-col px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            <span>Progresif Kuantitas:</span>
                            <span>Paket pertama: <b>Rp {p.firstQty?.toLocaleString?.() || p.firstQty}</b></span>
                            <span>Paket ke-2 dst: <b>Rp {p.nextQty?.toLocaleString?.() || p.nextQty}</b></span>
                          </span>
                        );
                      }
                    }
                    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Skema tidak dikenali</span>;
                  })()}
                  {/* Hanya tampilkan info tarif aktif dari location.pricing, tanpa biaya terakhir/history */}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEditClick(location)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  title="Edit Location"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(location.id, location.name)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  title="Delete Location"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={sortedLocations.length}
        onPageChange={setPage}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() =>
          setDeleteDialog({ isOpen: false, locationId: null, locationName: "" })
        }
        onConfirm={handleDeleteConfirm}
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteDialog.locationName}"? All associated packages will be affected.`}
        confirmText="Delete"
        loading={deleting}
      />

      <Modal
        isOpen={locationModal.isOpen}
        onClose={handleModalClose}
        title={locationModal.mode === "add" ? "Add New Location" : "Edit Location"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lokasi
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Skema Harga
            </h3>
            <div className="mb-3">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                value={formData.pricingScheme}
                onChange={e => {
                  const scheme = e.target.value;
                  let pricing = {};
                  if (scheme === "flat_by_size") {
                    pricing = { S: 5000, M: 7000, L: 10000 };
                  } else if (scheme === "flat_per_day") {
                    pricing = { flat: 10000 };
                  } else if (scheme === "progressive_days") {
                    pricing = { firstDay: 1000, nextDay: 500 };
                  } else if (scheme === "progressive_qty") {
                    pricing = { firstQty: 1000, nextQty: 500 };
                  }
                  setFormData({ ...formData, pricingScheme: scheme, pricing });
                }}
              >
                <option value="flat_by_size">Flat by Size (S/M/L)</option>
                <option value="flat_per_day">Flat per Hari (1x24 jam)</option>
                <option value="progressive_days">Progresif Hari</option>
                <option value="progressive_qty">Progresif Kuantitas</option>
              </select>
            </div>
            {/* Field harga sesuai skema */}
            {formData.pricingScheme === "flat_by_size" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Small (S)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.S}
                    onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, S: Number(e.target.value) } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medium (M)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.M}
                    onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, M: Number(e.target.value) } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Large (L)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.L}
                    onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, L: Number(e.target.value) } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
              </div>
            )}
            {formData.pricingScheme === "flat_per_day" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Flat per 1x24 Jam</label>
                <input
                  type="number"
                  value={formData.pricing.flat}
                  onChange={e => setFormData({ ...formData, pricing: { flat: Number(e.target.value) } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  min="0"
                />
              </div>
            )}
            {formData.pricingScheme === "progressive_days" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progresif Hari</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Hari Masuk (Rp)</label>
                    <input
                      type="number"
                      value={formData.pricing.firstDay || 1000}
                      onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, firstDay: Number(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Hari Berikutnya (Rp)</label>
                    <input
                      type="number"
                      value={formData.pricing.nextDay || 500}
                      onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, nextDay: Number(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                      min="0"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">* Hitung progresif per hari, hari masuk harga khusus, hari berikutnya harga berbeda.</div>
              </div>
            )}
            {formData.pricingScheme === "progressive_qty" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progresif Kuantitas (cut off 23:59)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Paket Pertama (Rp)</label>
                    <input
                      type="number"
                      value={formData.pricing.firstQty || 1000}
                      onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, firstQty: Number(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Paket Berikutnya (Rp)</label>
                    <input
                      type="number"
                      value={formData.pricing.nextQty || 500}
                      onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, nextQty: Number(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                      min="0"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">* Hitung progresif per paket, reset setiap hari jam 00:00.</div>
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (hari)</label>
              <input
                type="number"
                value={formData.gracePeriod}
                onChange={e => setFormData({ ...formData, gracePeriod: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min="0"
                required
              />
              <div className="text-xs text-gray-500 mt-1">0 = langsung bayar, 1 = gratis 1 hari, dst.</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="enableDelivery"
                checked={formData.enableDelivery}
                onChange={(e) =>
                  setFormData({ ...formData, enableDelivery: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <label
                htmlFor="enableDelivery"
                className="text-sm font-medium text-gray-700"
              >
                Enable Delivery
              </label>
            </div>

            {formData.enableDelivery && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Fee (IDR)
                </label>
                <input
                  type="number"
                  value={formData.deliveryFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryFee: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="0"
                />
              </div>
            )}

            <div className="flex items-center gap-2 mb-3 mt-4">
              <input
                type="checkbox"
                id="enableMembership"
                checked={formData.enableMembership}
                onChange={(e) =>
                  setFormData({ ...formData, enableMembership: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <label htmlFor="enableMembership" className="text-sm font-medium text-gray-700">Enable Membership</label>
            </div>

            {formData.enableMembership && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membership Fee (IDR)</label>
                <input
                  type="number"
                  value={formData.membershipFee}
                  onChange={(e) => setFormData({ ...formData, membershipFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : locationModal.mode === "add"
                ? "Create"
                : "Update"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
