import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pickpoint - Manajemen Paket Berbayar",
  description: "Platform manajemen penerimaan paket berbayar untuk apartemen dan kantor",
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Public Navbar */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Pickpoint</h1>
          <div className="space-x-4">
            <a href="/" className="text-slate-600 hover:text-slate-900">Home</a>
            <a href="/track" className="text-slate-600 hover:text-slate-900">Track</a>
            <a href="/auth/login" className="text-slate-600 hover:text-slate-900">Login</a>
          </div>
        </div>
      </nav>
      
      <main>{children}</main>
    </div>
  )
}
