'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/login'
    },
  })
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Selamat datang di Pickpoint Admin Portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Total User</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Total Lokasi</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Total Paket</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Pendapatan (Bulan)</div>
          <div className="text-3xl font-bold mt-2">--</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            + Buat User
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
            + Tambah Lokasi
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
            + Input Paket
          </button>
        </div>
      </div>
    </div>
  )
}
