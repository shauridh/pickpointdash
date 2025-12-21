"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package as PackageIcon, Loader2, Plus, Edit, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Package {
  id: string;
  trackingCode: string;
  senderName: string;
  receiverName: string;
  status: string;
  size: string;
  location: {
    name: string;
  };
  createdAt: string;
}

// This page is now merged into dashboard
export default function PackagesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="p-6 text-center text-gray-500">
      <h2 className="text-2xl font-bold mb-2">Mengalihkan ke Dashboard…</h2>
      <p>Manajemen paket sekarang berada di Dashboard.</p>
    </div>
  );
}
