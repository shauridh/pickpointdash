"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { Package, Eye, EyeOff, Loader2, ArrowUp, ArrowDown, Users, MapPin, CreditCard } from "lucide-react";
import PackageTable from "./PackageTable"; // Import the new component

interface Stats {
  totalUsers: number;
  totalLocations: number;
  totalPackages: number;
  totalRevenue: number;
  revenueDelivery: number;
  revenueSubscription: number;
  revenuePackage: number;
  packagesByStatus: {
    arrived: number;
    picked: number;
    destroyed: number;
  };
}

// Helper for revenue fallback
const getRevenue = (stats: Stats | null, key: keyof Stats, fallback = 0) => {
  return stats && typeof stats[key] === "number" ? (stats[key] as number) : fallback;
};

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "all">("week");
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const [showStats, setShowStats] = useState(true);


  // Cek login hanya sekali saat mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
    }
  }, [router]);

  // Realtime update via socket.io
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    fetchStats();
    // Connect to socket.io server
    if (!socketRef.current) {
      socketRef.current = io("/api/socket", {
        path: "/api/socket",
        transports: ["websocket"],
      });
    }
    const socket = socketRef.current;
    // Listen for dashboard update event
    socket.on("dashboard-stats-update", fetchStats);
    return () => {
      socket.off("dashboard-stats-update", fetchStats);
    };
  }, [timeframe]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/stats?timeframe=${timeframe}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        console.error(data.error || "Failed to load dashboard stats.");
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStats((s) => !s)} className={`px-3 py-1 rounded-lg text-sm ${showStats ? "bg-white border" : "bg-amber-600 text-white"}`}>
            {showStats ? "Hide Cards" : "Show Cards"}
          </button>
        </div>
        {showStats && (
          <div className="flex items-center gap-2">
            {(["day", "week", "month", "all"] as const).map((t) => (
              <button key={t} onClick={() => setTimeframe(t)} className={`px-3 py-1 rounded-lg text-sm ${timeframe === t ? "bg-amber-600 text-white" : "bg-white border"}`}>
                {t === "day" ? "Hari" : t === "week" ? "Minggu" : t === "month" ? "Bulan" : "All Time"}
              </button>
            ))}
          </div>
        )}
      </div>

      {showStats && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Paket Masuk */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Paket Masuk</p>
                <ArrowDown className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">{stats?.packagesByStatus?.arrived ?? 0}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Periode dipilih</p>
        </div>

        {/* Card 2: Paket Keluar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Paket Keluar</p>
                <ArrowUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">{stats?.packagesByStatus?.picked ?? 0}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Periode dipilih</p>
        </div>

        {/* Card 3: Total Paket */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Total Paket</p>
                <Package className="h-4 w-4 text-orange-500" />
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">{stats?.totalPackages ?? 0}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Inventaris Aktif</p>
        </div>

        {/* Card 4: Member Aktif */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Member Aktif</p>
                <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers ?? 0}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Langganan Aktif</p>
        </div>

        {/* Card 5: Pendapatan Pengantaran */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Pendapatan Pengantaran</p>
                <CreditCard className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2">
                <p className="text-xl font-bold text-gray-900">
                    {showRevenue ? `Rp ${(getRevenue(stats, "revenueDelivery")).toLocaleString()}` : "••••••"}
                </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Delivery fee</p>
        </div>

        {/* Card 6: Pendapatan Membership */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Pendapatan Membership</p>
                <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2">
                <p className="text-xl font-bold text-gray-900">
                    {showRevenue ? `Rp ${(getRevenue(stats, "revenueSubscription")).toLocaleString()}` : "••••••"}
                </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Subscription</p>
        </div>

        {/* Card 7: Pendapatan Paket */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Pendapatan Paket</p>
                <Package className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2">
                <p className="text-xl font-bold text-gray-900">
                    {showRevenue ? `Rp ${(getRevenue(stats, "revenuePackage")).toLocaleString()}` : "••••••"}
                </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Storage fee</p>
        </div>

        {/* Card 8: Total Pendapatan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase">Total Pendapatan</p>
                <CreditCard className="h-4 w-4 text-slate-700" />
            </div>
            <div className="mt-2">
                <p className="text-xl font-bold text-gray-900">
                    {showRevenue ? `Rp ${(getRevenue(stats, "totalRevenue")).toLocaleString()}` : "••••••"}
                </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Total Kotor</p>
        </div>
      </div>
      )}
      
      {/* Render the extracted package table component */}
      <PackageTable />
    </div>
  );
}