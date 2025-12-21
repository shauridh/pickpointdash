import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const allowDevBypass = process.env.DEBUG === "true";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session && !allowDevBypass) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { to, number, phoneNumber, phone, recipient, message, text, vars } = body as {
      to?: string; number?: string; phoneNumber?: string; phone?: string; recipient?: string; message?: string; text?: string; vars?: Record<string, any>;
    };

    const dest = number || to || phoneNumber || phone || recipient;
    const msg = message ?? text;

    // Simple template interpolation: replace {key} with vars[key]
    const interpolate = (template: string, varsObj: Record<string, any> | undefined) => {
      if (!template) return template;
      if (!varsObj || typeof varsObj !== 'object') return template;
      return template.replace(/\{\s*([a-zA-Z0-9_\.\-]+)\s*\}/g, (_, key) => {
        // support nested keys like user.name
        const parts = key.split('.');
        let v: any = varsObj;
        for (const p of parts) {
          if (v == null) return `{${key}}`;
          v = v[p];
        }
        return v == null ? `{${key}}` : String(v);
      });
    };

    const renderedMsg = interpolate(String(msg ?? ''), vars as Record<string, any> | undefined);

    if (!dest || !msg) {
      return NextResponse.json({ success: false, error: "Field tujuan (number/to/phone) dan message/text wajib ada" }, { status: 400 });
    }

    const settings = await prisma.setting.findMany({ where: { key: { in: ["waEndpoint", "waApiKey", "waSender"] } } });
    const cfg: Record<string, string> = {};
    settings.forEach(s => (cfg[s.key] = s.value));

    // Allow request-level override for quick tests
    const endpoint = (body?.endpoint as string) || cfg.waEndpoint || process.env.WHATSAPP_API_ENDPOINT || "";
    const apiKey = (body?.api_key as string) || cfg.waApiKey || process.env.WHATSAPP_API_KEY || "";
    const sender = (body?.sender as string) || cfg.waSender || process.env.WHATSAPP_ACCOUNT_ID || "";

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Gateway endpoint (waEndpoint) belum dikonfigurasi." }, { status: 400 });
    }

    // Provider spec (GetSender): JSON with api_key, sender, number, message (working variant found)
    const variants: Array<{ name: string; headers: Record<string, string>; body: Record<string, string> }> = [
      {
        name: "json.api_key+sender+number+message",
        headers: { "Content-Type": "application/json" },
        body: { api_key: apiKey, sender, number: dest, message: renderedMsg },
      },
    ];

    const attempts: Array<{ variant: string; status: number; text: string }> = [];
    let successPayload: any = null;
    for (const v of variants) {
      const isForm = v.headers["Content-Type"] === "application/x-www-form-urlencoded";
      const bodyPayload = isForm
        ? new URLSearchParams(Object.entries(v.body)).toString()
        : JSON.stringify(v.body);

      const resp = await fetch(endpoint, { method: "POST", headers: v.headers, body: bodyPayload });
      const textResp = await resp.text();
      attempts.push({ variant: v.name, status: resp.status, text: textResp });
      if (resp.ok) {
        try { successPayload = JSON.parse(textResp); } catch { successPayload = textResp; }
        break;
      }
    }

    if (!successPayload) {
      return NextResponse.json({ success: false, error: "Gateway menolak semua varian.", attempts }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: successPayload });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as any)?.message || "Proxy send failed" }, { status: 500 });
  }
}
