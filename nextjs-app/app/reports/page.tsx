"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  Line,
} from "recharts";
import { Loader2 } from "lucide-react";

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

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data as Stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-gray-600">Tidak ada data statistik tersedia.</div>
    );
  }

  // Prepare data for charts safely
  const revenueData = [
    { name: "Delivery", value: stats?.revenueDelivery ?? 0 },
    { name: "Subscription", value: stats?.revenueSubscription ?? 0 },
    { name: "Package", value: stats?.revenuePackage ?? 0 },
  ];

  const statusData = [
    { name: "Arrived", value: stats?.packagesByStatus?.arrived ?? 0 },
    { name: "Picked", value: stats?.packagesByStatus?.picked ?? 0 },
    { name: "Destroyed", value: stats?.packagesByStatus?.destroyed ?? 0 },
  ];

  const radarData = [
    { metric: "Users", value: stats?.totalUsers ?? 0, fullMark: Math.max(stats?.totalUsers ?? 0, 1) },
    { metric: "Locations", value: stats?.totalLocations ?? 0, fullMark: Math.max(stats?.totalLocations ?? 0, 1) },
    { metric: "Packages", value: stats?.totalPackages ?? 0, fullMark: Math.max(stats?.totalPackages ?? 0, 1) },
    { metric: "Revenue (k)", value: Math.round((stats?.totalRevenue ?? 0) / 1000), fullMark: Math.max(Math.round((stats?.totalRevenue ?? 0) / 1000), 1) },
  ];

  const composedData = [
    {
      name: "Summary",
      packages: stats?.totalPackages ?? 0,
      revenue: stats?.totalRevenue ?? 0,
    },
  ];

  const COLORS = ["#60A5FA", "#A78BFA", "#F59E0B"];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Reports & Statistics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold mb-2">Revenue Breakdown</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={revenueData} dataKey="value" nameKey="name" outerRadius={70} fill="#8884d8">
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Nilai dibulatkan sesuai data API. Revenue total: Rp {(stats?.totalRevenue ?? 0).toLocaleString()}.
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold mb-2">Package Status</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#60A5FA" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-gray-600">Menampilkan jumlah paket per status.</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold mb-2">High-level Composition</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <ComposedChart data={composedData}>
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value: number) => (value >= 1000 ? `Rp ${value.toLocaleString()}` : value)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" fill="#A78BFA" stroke="#7C3AED" />
                <Bar dataKey="packages" barSize={20} fill="#60A5FA" />
                <Line type="monotone" dataKey="revenue" stroke="#111827" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-gray-600">Gabungan ringkasan paket dan revenue.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold mb-2">Multi-metric Radar</h3>
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                <Radar name="Value" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-gray-600">Radar memberikan perbandingan relatif antar metrik utama.</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold mb-2">Detail Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total Users</p>
              <p className="text-lg font-semibold">{stats?.totalUsers ?? 0}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total Locations</p>
              <p className="text-lg font-semibold">{stats?.totalLocations ?? 0}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total Packages</p>
              <p className="text-lg font-semibold">{stats?.totalPackages ?? 0}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-semibold">Rp {(stats?.totalRevenue ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
