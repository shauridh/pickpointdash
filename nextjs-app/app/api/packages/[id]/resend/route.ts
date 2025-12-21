import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ success: false, error: "Package id required" }, { status: 400 });

    const pkg = await prisma.package.findUnique({ where: { id }, include: { location: true } });
    if (!pkg) return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 });

    // Read template setting
    const settings = await prisma.setting.findMany({ where: { key: { in: ["waTemplatePackage", "waEndpoint", "waApiKey", "waSender"] } } });
    const cfg: Record<string, string> = {};
    settings.forEach(s => (cfg[s.key] = s.value));
    const template = cfg.waTemplatePackage || "Halo {nama}, paket {resi} sudah tiba di {lokasi}.";

    const interpolate = (tpl: string, varsObj?: Record<string, any>) => {
      if (!tpl) return tpl;
      if (!varsObj || typeof varsObj !== 'object') return tpl;
      return tpl.replace(/\{\s*([a-zA-Z0-9_\.\-]+)\s*\}/g, (_, key) => {
        const parts = key.split('.');
        let v: any = varsObj;
        for (const p of parts) {
          if (v == null) return `{${key}}`;
          v = v[p];
        }
        return v == null ? `{${key}}` : String(v);
      });
    };

    const vars = {
      nama: pkg.receiverName,
      resi: pkg.trackingCode,
      lokasi: pkg.location?.name || "",
      link: (process.env.APP_URL || (typeof request !== 'undefined' && (request as any).nextUrl ? (request as any).nextUrl.origin : '')) + `/packages/${pkg.trackingCode}`,
    };

    const rendered = interpolate(String(template), vars as Record<string, any>);

    // call internal proxy
    const origin = (typeof request !== 'undefined' && (request as any).nextUrl) ? (request as any).nextUrl.origin : process.env.APP_URL || '';
    const proxyUrl = new URL('/api/wa/send', origin || 'http://localhost').toString();
    const cookieHeader = (request as any).headers?.get ? (request as any).headers.get('cookie') : undefined;

    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { cookie: cookieHeader } : {}) },
      body: JSON.stringify({ number: pkg.receiverPhone, message: rendered, vars }),
    });

    const text = await resp.text();
    await prisma.activity.create({ data: { packageId: pkg.id, type: 'NOTIFICATION_RESEND', description: `resend status=${resp.status} resp=${text.substring(0,1000)}` } });

    if (!resp.ok) return NextResponse.json({ success: false, error: 'Gateway rejected resend', detail: text }, { status: 502 });
    try { return NextResponse.json({ success: true, message: 'Notification resent', gatewayResponse: JSON.parse(text) }); } catch { return NextResponse.json({ success: true, message: 'Notification resent', gatewayResponse: text }); }
  } catch (error: any) {
    console.error('Resend error', error);
    return NextResponse.json({ success: false, error: error.message || 'Resend failed' }, { status: 500 });
  }
}
