'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { LogOut, Users, Building2, Settings } from 'lucide-react'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-black">Pickpoint</h1>
          <p className="text-sm text-gray-600 mt-1">Admin Portal</p>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <Link
            href="/portal/dashboard"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
          >
            Dashboard
          </Link>
          {session.user?.role === 'SUPER_ADMIN' && (
            <>
              <Link
                href="/portal/users"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition"
              >
                <Users size={18} />
                Kelola User
              </Link>
              <Link
                href="/portal/locations"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition"
              >
                <Building2 size={18} />
                Lokasi
              </Link>
              <Link
                href="/portal/settings"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition"
              >
                <Settings size={18} />
                Pengaturan
              </Link>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Halo, {session.user?.name}
            </h2>
            <p className="text-sm text-gray-600">{session.user?.role}</p>
          </div>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
