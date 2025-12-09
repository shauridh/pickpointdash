'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, X, Edit2 } from 'lucide-react'

interface Location {
  id: string
  name: string
  code: string
  address: string
  managerId: string
  gracePeriodDays: number
  priceDayOne: number
  priceNextDay: number
  priceFirstPackage: number
  priceNextPackage: number
  deliveryFee: number
  manager?: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string | null
  role: string
}

export default function LocationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    managerId: '',
  })

  const [pricingData, setPricingData] = useState({
    gracePeriodDays: 0,
    priceDayOne: 0,
    priceNextDay: 0,
    priceFirstPackage: 0,
    priceNextPackage: 0,
    deliveryFee: 0,
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/portal/dashboard')
      return
    }

    fetchLocations()
    fetchManagers()
  }, [status, session, router])

  async function fetchLocations() {
    try {
      const res = await fetch('/api/v1/locations')
      if (!res.ok) throw new Error('Gagal mengambil data lokasi')
      const data = await res.json()
      setLocations(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchManagers() {
    try {
      const res = await fetch('/api/v1/users')
      if (!res.ok) throw new Error('Gagal mengambil data manager')
      const data = await res.json()
      const locationManagers = (data.data || []).filter(
        (u: User) => u.role === 'LOCATION_MANAGER'
      )
      setManagers(locationManagers)
    } catch (err) {
      console.error('Error fetching managers:', err)
    }
  }

  async function handleCreateLocation(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/v1/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || 'Gagal membuat lokasi')
      }

      setSuccess('Lokasi berhasil dibuat')
      setFormData({ name: '', code: '', address: '', managerId: '' })
      setShowCreateModal(false)
      fetchLocations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function handleUpdatePricing(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLocation) return

    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/v1/locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingData),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || 'Gagal update pricing')
      }

      setSuccess('Pricing berhasil diupdate')
      setShowPricingModal(false)
      setSelectedLocation(null)
      fetchLocations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return <div className="text-red-600">Akses ditolak</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Lokasi</h1>
          <p className="text-gray-600 mt-1">Total: {locations.length} lokasi</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Tambah Lokasi
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded">
          {success}
        </div>
      )}

      {/* Locations List */}
      <div className="grid gap-4">
        {locations.map((location) => (
          <div key={location.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{location.name}</h3>
                <p className="text-sm text-gray-600">Kode: {location.code}</p>
                <p className="text-sm text-gray-600 mt-1">{location.address}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedLocation(location)
                  setPricingData({
                    gracePeriodDays: location.gracePeriodDays,
                    priceDayOne: location.priceDayOne,
                    priceNextDay: location.priceNextDay,
                    priceFirstPackage: location.priceFirstPackage,
                    priceNextPackage: location.priceNextPackage,
                    deliveryFee: location.deliveryFee,
                  })
                  setShowPricingModal(true)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
              >
                <Edit2 size={16} />
                Pricing
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600">Manager</p>
                <p className="font-semibold">{location.manager?.name || '-'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600">Grace Period</p>
                <p className="font-semibold">{location.gracePeriodDays} hari</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600">Harga Hari 1</p>
                <p className="font-semibold">Rp {location.priceDayOne.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600">Harga/Hari Lanjutan</p>
                <p className="font-semibold">Rp {location.priceNextDay.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600">Harga Paket 1</p>
                <p className="font-semibold">Rp {location.priceFirstPackage.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600">Biaya Antar</p>
                <p className="font-semibold">Rp {location.deliveryFee.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Location Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Tambah Lokasi Baru</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Lokasi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2 mt-1"
                  placeholder="e.g. Apartment A Block"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kode Lokasi *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border rounded px-3 py-2 mt-1"
                  placeholder="e.g. APT-A"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Alamat *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded px-3 py-2 mt-1"
                  placeholder="Alamat lengkap lokasi"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Manager *</label>
                <select
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  className="w-full border rounded px-3 py-2 mt-1"
                  required
                >
                  <option value="">-- Pilih Manager --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Buat Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Setup Pricing - {selectedLocation.name}</h2>
              <button
                onClick={() => setShowPricingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdatePricing} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Grace Period (Hari)</label>
                <input
                  type="number"
                  value={pricingData.gracePeriodDays}
                  onChange={(e) =>
                    setPricingData({
                      ...pricingData,
                      gracePeriodDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                  min="0"
                  max="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Harga Hari Pertama</label>
                <input
                  type="number"
                  value={pricingData.priceDayOne}
                  onChange={(e) =>
                    setPricingData({
                      ...pricingData,
                      priceDayOne: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Harga/Hari Berikutnya</label>
                <input
                  type="number"
                  value={pricingData.priceNextDay}
                  onChange={(e) =>
                    setPricingData({
                      ...pricingData,
                      priceNextDay: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Harga Paket 1</label>
                <input
                  type="number"
                  value={pricingData.priceFirstPackage}
                  onChange={(e) =>
                    setPricingData({
                      ...pricingData,
                      priceFirstPackage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Harga Paket 2+</label>
                <input
                  type="number"
                  value={pricingData.priceNextPackage}
                  onChange={(e) =>
                    setPricingData({
                      ...pricingData,
                      priceNextPackage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Biaya Pengiriman</label>
                <input
                  type="number"
                  value={pricingData.deliveryFee}
                  onChange={(e) =>
                    setPricingData({
                      ...pricingData,
                      deliveryFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                  min="0"
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Simpan Pricing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
