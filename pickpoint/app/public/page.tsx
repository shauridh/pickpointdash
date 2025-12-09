export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Pickpoint</h1>
          <p className="text-xl mb-8">
            Solusi Manajemen Paket Berbayar untuk Apartemen dan Kantor
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50">
            Mulai Sekarang
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Fitur Unggulan</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-lg mb-2">Tracking Real-Time</h3>
            <p className="text-slate-600">
              Lacak paket Anda kapan saja, di mana saja dengan update real-time
            </p>
          </div>
          
          <div className="rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-lg mb-2">Pembayaran Digital</h3>
            <p className="text-slate-600">
              Bayar dengan mudah melalui QRIS, Transfer VA, atau metode pembayaran lainnya
            </p>
          </div>
          
          <div className="rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-lg mb-2">Notifikasi Instan</h3>
            <p className="text-slate-600">
              Dapatkan notifikasi via WhatsApp saat paket Anda tiba
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Siap Menggunakan Pickpoint?</h2>
        <a href="/auth/register" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
          Daftar Sekarang
        </a>
      </section>
    </div>
  )
}
