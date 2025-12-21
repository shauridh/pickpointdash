import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET all packages (with filters)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");
    const trackingCode = searchParams.get("trackingCode");

    const packages = await prisma.package.findMany({
      where: {
        ...(locationId && { locationId }),
        ...(status && { status: status as any }),
        ...(trackingCode && {
          trackingCode: { contains: trackingCode, mode: "insensitive" },
        }),
      },
      include: {
        location: true,
        customer: {
          select: { id: true, name: true, phoneNumber: true, unitNumber: true },
        },
        payments: {
          orderBy: { updatedAt: "desc" },
          select: { amount: true, status: true, updatedAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(packages);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST create package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trackingCode,
      locationId,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      size,
      weight,
      description,
      photo,
      customerId,
    } = body;

    if (!trackingCode || !locationId || !senderName || !receiverName || !receiverPhone) {
      return errorResponse("Missing required fields: trackingCode, locationId, senderName, receiverName, receiverPhone are required");
    }

    console.log("[API] packages POST body:", JSON.stringify(body));

    const allowedSizes = ['S', 'M', 'L'];
    const normalizedSize = allowedSizes.includes(size) ? size : 'S';

    const data: any = {
      trackingCode,
      locationId,
      senderName,
      senderPhone: senderPhone ?? "",
      receiverName,
      receiverPhone,
      size: normalizedSize,
      weight: weight ?? undefined,
      description: description ?? undefined,
      photo: photo ?? null,
    };

    if (customerId) data.customerId = customerId;

    let pkg;
    try {
      pkg = await prisma.package.create({
        data,
        include: { location: true },
      });
    } catch (err: any) {
      console.error("[API] prisma.package.create error:", err);
      return serverErrorResponse(err);
    }

    // Log activity
    await prisma.activity.create({
      data: {
        packageId: pkg.id,
        type: "PACKAGE_ARRIVED",
        description: `Package ${trackingCode} arrived at ${pkg.location.name}`,
      },
    });

    // Attempt to send WhatsApp notification via internal proxy (/api/wa/send)
    try {
      const settings = await prisma.setting.findMany({ where: { key: { in: ["waTemplatePackage", "waEndpoint", "waApiKey", "waSender"] } } });
      const cfg: Record<string, string> = {};
      settings.forEach(s => (cfg[s.key] = s.value));

      const template = cfg.waTemplatePackage || "Halo {nama},\nPaket dengan resi {resi} siap diambil di {lokasi}.";

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
        link: (process.env.APP_URL || request.nextUrl.origin) + `/packages/${pkg.trackingCode}`,
      };

      const rendered = interpolate(String(template), vars as Record<string, any>);

      // call internal proxy and forward cookies to preserve session (if any)
      const proxyUrl = new URL('/api/wa/send', request.nextUrl.origin).toString();
      const cookie = request.headers.get('cookie') || '';
      const resp = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify({ number: pkg.receiverPhone, message: rendered, vars }),
      });
      const respText = await resp.text();
      // create activity log for notification attempt
      await prisma.activity.create({ data: {
        packageId: pkg.id,
        type: 'NOTIFICATION_ATTEMPT',
        description: `Notification attempt status=${resp.status} resp=${respText.substring(0, 1000)}`,
      }});
    } catch (err) {
      console.error('Failed sending notification on package create:', err);
      try { await prisma.activity.create({ data: { packageId: pkg.id, type: 'NOTIFICATION_ERROR', description: String(err).substring(0,1000) } }); } catch {};
    }

    return successResponse(pkg, "Package created successfully");
  } catch (error: any) {
    if (error.code === "P2002") {
      return errorResponse("Tracking code already exists", 409);
    }
    return serverErrorResponse(error);
  }
}
