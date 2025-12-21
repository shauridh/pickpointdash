"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Send, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

type SimpleSettings = {
  waApiKey: string;
  waSender: string;
  waEndpoint: string;
  waTemplatePackage: string;
  enablePaymentGateway: boolean;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SimpleSettings>({
    waApiKey: "",
    waSender: "",
    waEndpoint: "",
    waTemplatePackage: "",
    enablePaymentGateway: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.success) {
          setSettings({
            waApiKey: data.data.waApiKey || "",
            waSender: data.data.waSender || "",
            waEndpoint: data.data.waEndpoint || "",
            waTemplatePackage: data.data.waTemplatePackage || "",
            enablePaymentGateway: (data.data.enablePaymentGateway || "false") === "true",
          });
        }
      } catch {
        toast.error("Gagal memuat settings.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function saveAll() {
    setIsSaving(true);
    try {
      const payload = {
        waApiKey: settings.waApiKey,
        waSender: settings.waSender,
        waEndpoint: settings.waEndpoint,
        waTemplatePackage: settings.waTemplatePackage,
        enablePaymentGateway: String(settings.enablePaymentGateway),
      };
      const res = await fetch("/api/settings/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Settings disimpan.");
      } else {
        toast.error(data.error || "Gagal menyimpan settings.");
      }
    } catch {
      toast.error("Network error menyimpan settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function testSend() {
    if (!testPhone) {
      toast.error("Masukkan nomor tujuan.");
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch("/api/wa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: testPhone, message: settings.waTemplatePackage || "Test kirim via GetSender" }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) toast.success(data.message || "Test terkirim.");
      else toast.error(data.error || "Gagal kirim test.");
    } catch {
      toast.error("Network error kirim test.");
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Settings</h2>
        <button onClick={saveAll} disabled={isSaving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border space-y-4">
        <h4 className="font-bold">WhatsApp Gateway</h4>
        <div>
          <label className="block text-xs font-semibold mb-1">API Key</label>
          <div className="relative">
            <input type={showApiKey ? "text" : "password"} value={settings.waApiKey} onChange={e=>setSettings({...settings, waApiKey:e.target.value})} className="w-full border rounded px-3 py-2 pr-10" placeholder="API Key" autoComplete="off" />
            <button type="button" className="absolute right-2 top-2.5 text-gray-500" onClick={()=>setShowApiKey(v=>!v)}>{showApiKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Sender (Nomor WA)</label>
          <input value={settings.waSender} onChange={e=>setSettings({...settings, waSender:e.target.value.replace(/[^0-9]/g,"")})} className="w-full border rounded px-3 py-2" placeholder="628xxxxxxxxxx" maxLength={15} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Endpoint URL</label>
          <input value={settings.waEndpoint} onChange={e=>setSettings({...settings, waEndpoint:e.target.value})} className="w-full border rounded px-3 py-2" placeholder="https://seen.getsender.id/send-message" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Template Paket</label>
          <textarea value={settings.waTemplatePackage} onChange={e=>setSettings({...settings, waTemplatePackage:e.target.value})} className="w-full border rounded px-3 py-2 h-28 font-mono" placeholder={`Halo {nama},\nPaket dengan resi {resi} siap diambil di {lokasi}.\nDetail: {link}`} />
        </div>
        <div className="flex gap-2">
          <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Nomor tujuan untuk test (628...)" />
          <button onClick={testSend} disabled={isTesting || !testPhone} className="bg-gray-900 text-white px-4 rounded hover:bg-black disabled:opacity-50 flex items-center gap-2">
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold">Payment Gateway</h4>
            <p className="text-xs text-gray-500">Aktifkan opsi QRIS (placeholder).</p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.enablePaymentGateway} onChange={e=>setSettings({...settings, enablePaymentGateway:e.target.checked})} />
            <span className="text-sm">Enable</span>
          </label>
        </div>
      </div>
    </div>
  );
}
