import React, { useState, useEffect } from 'react';
import { User } from '../types';
import Login from './Login';
import Dashboard from './Dashboard';
import Locations from './Locations';
import Users from './Users';
import Customers from './Customers';
import Settings from './Settings';
import Reports from './Reports';
import {
  LayoutDashboard,
  MapPin,
  Users as UsersIcon,
  Settings as SettingsIcon,
  LogOut,
  UserCircle,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type View = 'DASHBOARD' | 'LOCATIONS' | 'USERS' | 'CUSTOMERS' | 'SETTINGS' | 'REPORTS';

const AdminApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ui_isDesktopSidebarOpen');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const sessionUser = sessionStorage.getItem('pp_session');
    if (sessionUser) {
      setUser(JSON.parse(sessionUser));
    }
  }, []);

  const handleLogin = (u: User) => {
    sessionStorage.setItem('pp_session', JSON.stringify(u));
    setUser(u);
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pp_session');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const viewTitles: Record<View, string> = {
    DASHBOARD: 'Dasbor',
    REPORTS: 'Laporan',
    CUSTOMERS: 'Pelanggan',
    LOCATIONS: 'Lokasi',
    USERS: 'Pengguna',
    SETTINGS: 'Pengaturan'
  };

  const isAdmin = user.role === 'ADMIN';

  const NavItem = ({ view, icon: Icon, label, badge }: { view: View; icon: React.ComponentType<any>; label: string; badge?: number }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setMobileSidebarOpen(false);
      }}
      className={twMerge(
        'group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200',
        isDesktopSidebarOpen ? 'gap-3' : 'gap-0 justify-center',
        currentView === view
          ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30'
          : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
      )}
    >
      <div className={twMerge('flex items-center', isDesktopSidebarOpen ? 'gap-3' : 'gap-0')}>
        <Icon
          className={twMerge(
            'h-5 w-5 transition-colors',
            currentView === view ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'
          )}
        />
        <span className={twMerge('whitespace-nowrap', isDesktopSidebarOpen ? 'block' : 'hidden')}>{label}</span>
        {badge && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{badge}</span>}
      </div>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-100/60">
      {/* Sidebar */}
      <aside
        className={twMerge(
          'fixed left-0 top-0 z-40 h-full w-64 overflow-hidden border-r border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-[0_24px_80px_-40px_rgba(54,76,126,0.35)] transition-transform duration-300',
          isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20',
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="relative flex items-center gap-3 border-b border-slate-200/70 bg-gradient-to-r from-white via-white to-slate-50 px-5 py-6">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-500 p-2.5 shadow-lg shadow-indigo-500/30">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          {isDesktopSidebarOpen && (
            <div>
              <span className="block text-lg font-extrabold tracking-tight text-slate-900">Pickpoint</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">Smart Hub</span>
            </div>
          )}
          <button
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-4">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label={isDesktopSidebarOpen ? 'Dasbor' : ''} />
          <NavItem view="REPORTS" icon={BarChart3} label={isDesktopSidebarOpen ? 'Laporan' : ''} />
          <NavItem view="CUSTOMERS" icon={UserCircle} label={isDesktopSidebarOpen ? 'Pelanggan' : ''} />
          {isAdmin && (
            <>
              <div className={twMerge('mt-6 mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400', !isDesktopSidebarOpen && 'md:hidden')}>
                Menu Admin
              </div>
              <NavItem view="LOCATIONS" icon={MapPin} label={isDesktopSidebarOpen ? 'Lokasi' : ''} />
              <NavItem view="USERS" icon={UsersIcon} label={isDesktopSidebarOpen ? 'Pengguna' : ''} />
              <NavItem view="SETTINGS" icon={SettingsIcon} label={isDesktopSidebarOpen ? 'Pengaturan' : ''} />
            </>
          )}
        </nav>
        <div className={twMerge('border-t border-slate-200/80 bg-slate-50/80 p-4 transition-all duration-300', !isDesktopSidebarOpen && 'md:px-2')}>
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-sm font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className={twMerge('overflow-hidden text-left', !isDesktopSidebarOpen && 'md:hidden')}>
              <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="truncate text-xs uppercase tracking-[0.2em] text-slate-400">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:border-red-300 hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            {isDesktopSidebarOpen ? 'Keluar' : ''}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main
        className={twMerge(
          'flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-slate-100 transition-all duration-300',
          isDesktopSidebarOpen ? 'md:ml-64' : 'md:ml-20'
        )}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition-colors hover:bg-slate-100"
              onClick={() => {
                if (window.innerWidth >= 768) {
                  const next = !isDesktopSidebarOpen;
                  setDesktopSidebarOpen(next);
                  try {
                    localStorage.setItem('ui_isDesktopSidebarOpen', String(next));
                  } catch {}
                } else {
                  setMobileSidebarOpen(true);
                }
              }}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 sm:text-xl">{viewTitles[currentView]}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Pantau aktivitas dan kelola operasional Pickpoint</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <button
                className="relative rounded-full p-2 transition-colors hover:bg-slate-100"
                aria-label="Notifications"
                onClick={() => setShowNotif(v => !v)}
              >
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
                <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">Permintaan Pengantara</div>
                  <div className="px-4 py-3 text-sm text-slate-600">Belum ada permintaan pengantara.</div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-100"
                onClick={() => setShowUserMenu(v => !v)}
                aria-label="User menu"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-700 text-sm font-bold text-white">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden text-sm font-medium text-slate-800 sm:block">{user.name}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs capitalize text-slate-500">{user.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-2 sm:p-4 md:p-8">
          {currentView === 'DASHBOARD' && <Dashboard user={user} />}
          {currentView === 'REPORTS' && <Reports />}
          {currentView === 'LOCATIONS' && isAdmin && <Locations />}
          {currentView === 'USERS' && isAdmin && <Users />}
          {currentView === 'CUSTOMERS' && <Customers user={user} />}
          {currentView === 'SETTINGS' && isAdmin && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default AdminApp;
