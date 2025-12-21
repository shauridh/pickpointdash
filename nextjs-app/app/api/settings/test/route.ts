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

    const body = await request.json();
    const { phoneNumber, template, vars } = body as { phoneNumber?: string; template?: string; vars?: Record<string, any> };

    if (!phoneNumber || !template) {
      return NextResponse.json(
        { success: false, error: "Phone number and template are required" },
        { status: 400 }
      );
    }

    // Simple template interpolation for placeholders like {nama}
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

    const renderedTemplate = interpolate(String(template), vars);

    // Read gateway settings
    const settings = await prisma.setting.findMany({ where: { key: { in: ["waEndpoint", "waApiKey", "waSender"] } } });
    const cfg: Record<string, string> = {};
    settings.forEach(s => (cfg[s.key] = s.value));

    const endpoint = cfg.waEndpoint || process.env.WHATSAPP_API_ENDPOINT || "";
    const apiKey = cfg.waApiKey || process.env.WHATSAPP_API_KEY || "";
    const sender = cfg.waSender || process.env.WHATSAPP_ACCOUNT_ID || "";

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Gateway endpoint (waEndpoint) belum dikonfigurasi." }, { status: 400 });
    }

    // Prepare provider-specific variant first (Seender/GetSender)
    const variants: Array<{
      name: string;
      headers: Record<string, string>;
      body: any;
    }> = [];

    // Preferred: JSON with api_key, sender, number, message, full=1
    variants.push({
      name: "json.api_key+sender+number+message+full",
      headers: { "Content-Type": "application/json" },
      body: { api_key: apiKey, sender, number: phoneNumber, message: renderedTemplate, full: 1 },
    });

    // Variant A: generic provider-style with api_key in body and message field (to)
    variants.push({
      name: "body.api_key+sender+to+message",
      headers: { "Content-Type": "application/json" },
      body: { api_key: apiKey, sender, to: phoneNumber, message: renderedTemplate },
    });

    // Variant B: sender_id instead of sender
    variants.push({
      name: "body.api_key+sender_id+to+message",
      headers: { "Content-Type": "application/json" },
      body: { api_key: apiKey, sender_id: sender, to: phoneNumber, message: renderedTemplate },
    });

    // Variant C: Authorization Bearer + original fields
    variants.push({
      name: "auth.bearer+to+from+template",
      headers: { "Content-Type": "application/json", Authorization: apiKey ? `Bearer ${apiKey}` : "" },
      body: { to: phoneNumber, from: sender, template: renderedTemplate },
    });

    // Variant D: x-api-key header + original fields
    variants.push({
      name: "header.x-api-key+to+from+template",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: { to: phoneNumber, from: sender, template: renderedTemplate },
    });

    // Variant E: application/x-www-form-urlencoded with common field names
    variants.push({
      name: "form-urlencoded api_key+sender+to+message",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: { api_key: apiKey, sender, to: phoneNumber, message: renderedTemplate },
    });

    const attempts: Array<{ variant: string; status: number; text: string }> = [];
    let successPayload: any = null;
    for (const v of variants) {
      // Clean headers without empty values
      const headers = Object.fromEntries(Object.entries(v.headers).filter(([, val]) => !!val));
      const isForm = headers["Content-Type"] === "application/x-www-form-urlencoded";
      const bodyPayload = isForm
        ? new URLSearchParams(Object.entries(v.body as Record<string, string>)).toString()
        : JSON.stringify(v.body);

      const resp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: bodyPayload,
      });
      const text = await resp.text();
      attempts.push({ variant: v.name, status: resp.status, text });
      if (resp.ok) {
        try {
          successPayload = JSON.parse(text);
        } catch {
          successPayload = text;
        }
        break;
      }
    }

    if (!successPayload) {
      return NextResponse.json({
        success: false,
        error: "Gateway menolak permintaan (coba beberapa format).",
        attempts,
      }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: `Test message sent to ${phoneNumber}`, gatewayResponse: successPayload });
  } catch (error) {
    console.error("Error sending test WhatsApp:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test message.", detail: (error as any)?.message },
      { status: 500 }
    );
  }
}