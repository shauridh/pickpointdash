'use client'

import { useSession } from 'next-auth/react'
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Users,
  MapPin,
  Package,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  totalLocations: number
  totalPackages: number
  monthlyRevenue: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/login'
    },
  })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    let isMounted = true

    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        setStats(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch stats:', error)
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)

  const statCards = [
    {
      title: 'Total User',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      accent: 'from-sky-500/20 to-sky-500/5',
    },
    {
      title: 'Total Lokasi',
      value: stats?.totalLocations ?? 0,
      icon: MapPin,
      accent: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      title: 'Total Paket',
      value: stats?.totalPackages ?? 0,
      icon: Package,
      accent: 'from-amber-500/20 to-amber-500/5',
    },
    {
      title: 'Pendapatan (Bulan)',
      value: stats ? formatCurrency(stats.monthlyRevenue) : 'Rp 0',
      icon: CreditCard,
      accent: 'from-fuchsia-500/20 to-fuchsia-500/5',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.16),transparent_30%)]" />
        <div className="relative p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <Sparkles className="h-4 w-4" />
              Dashboard Overview
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Selamat datang, {session.user?.name || session.user?.email}
            </h1>
            <p className="mt-2 text-white/70">
              Pantau operasional Pickpoint: user, lokasi, paket, dan pendapatan bulan berjalan.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/80">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Status</div>
              <div className="text-sm font-semibold">Online</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-xl bg-white shadow animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`h-1.5 w-full rounded-t-xl bg-gradient-to-r ${card.accent}`} />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <card.icon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-3 text-3xl font-semibold text-gray-900">{card.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-100 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Aksi Cepat</h2>
            <span className="text-xs text-gray-500">Operasional</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Buat User
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </button>
            <button className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                Tambah Lokasi
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </button>
            <button className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                Input Paket
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </button>
            <button className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:-translate-y-0.5 hover:border-fuchsia-300 hover:shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-fuchsia-500" />
                Rekap Pembayaran
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
            <span className="text-xs text-gray-500">Realtime feed</span>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-gray-600">
            Belum ada aktivitas terbaru. Setelah data masuk, log akan tampil di sini.
          </div>
        </div>
      </div>
    </div>
  )
}
            + Input Paket
          </button>
        </div>
      </div>
    </div>
  )
}
