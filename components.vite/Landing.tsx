
import React from 'react';
import { ShieldCheck, Zap, Users, BarChart3, Package as PackageIcon } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <span className="text-xl font-bold tracking-tight">Pickpoint</span>
          </div>
           {/* Tidak ada link tracking/form di landing page untuk tenant */}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-20 px-6 text-center max-w-4xl mx-auto animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400 text-white text-xs font-bold uppercase tracking-wider mb-6 animate-bounce">
          <Zap className="w-4 h-4 animate-spin" /> Solusi Paket Otomatis
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight animate-slide-in">
          Pickpoint: Mudah, Aman, & Efisien
        </h1>
        <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in">
          Kelola paket apartemen tanpa ribet. Notifikasi WhatsApp otomatis, pickup dengan kode unik, dan laporan digital siap pakai. Cocok untuk manajemen gedung modern.
        </p>
        <div className="flex justify-center gap-4 mt-8">
          <a href="https://wa.me/628123456789" target="_blank" rel="noopener" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 animate-pulse flex items-center justify-center gap-2">
            Coba Demo Gratis
          </a>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 hover:shadow-lg transition-shadow animate-fade-in">
            <ShieldCheck className="w-10 h-10 text-blue-600 mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-slate-800 mb-3">Keamanan & Akuntabilitas</h3>
            <p className="text-slate-500 leading-relaxed">Setiap paket difoto, dicatat, dan pickup diverifikasi dengan kode unik. Tidak ada lagi paket hilang atau komplain.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 hover:shadow-lg transition-shadow animate-fade-in delay-100">
            <Users className="w-10 h-10 text-blue-600 mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-slate-800 mb-3">Membership & Laporan Digital</h3>
            <p className="text-slate-500 leading-relaxed">Buka peluang pendapatan baru. Member bebas biaya simpan, semua aktivitas tercatat dan bisa diekspor kapan saja.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 hover:shadow-lg transition-shadow animate-fade-in delay-200">
            <Zap className="w-10 h-10 text-blue-600 mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-slate-800 mb-3">Notifikasi WhatsApp Otomatis</h3>
            <p className="text-slate-500 leading-relaxed">Penghuni langsung tahu saat paket tiba. Pickup mudah, cepat, dan aman tanpa ribet komunikasi manual.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 animate-fade-in">Bagaimana Pickpoint Bekerja?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center">
              <PackageIcon className="w-10 h-10 text-blue-600 mb-3 animate-bounce" />
              <span className="font-bold text-slate-800 mb-2">Terima Paket</span>
              <span className="text-slate-500 text-sm">Front desk scan & foto paket</span>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-10 h-10 text-blue-600 mb-3 animate-bounce" />
              <span className="font-bold text-slate-800 mb-2">Notifikasi WhatsApp</span>
              <span className="text-slate-500 text-sm">Penghuni langsung dapat info & kode pickup</span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-10 h-10 text-blue-600 mb-3 animate-bounce" />
              <span className="font-bold text-slate-800 mb-2">Pickup Aman</span>
              <span className="text-slate-500 text-sm">Verifikasi kode, serah terima tercatat digital</span>
            </div>
            <div className="flex flex-col items-center">
              <BarChart3 className="w-10 h-10 text-blue-600 mb-3 animate-bounce" />
              <span className="font-bold text-slate-800 mb-2">Laporan & Analitik</span>
              <span className="text-slate-500 text-sm">Semua data bisa diekspor, analisa performa</span>
            </div>
          </div>
        </div>
      </section>

      {/* ...existing code... */}

      <footer className="bg-white border-t border-slate-100 py-12 px-6 text-center text-slate-400 text-sm">
        <p>&copy; 2024 Pickpoint Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
