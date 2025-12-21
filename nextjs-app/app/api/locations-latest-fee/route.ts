import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

// GET /api/locations-latest-fee?locationId=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    if (!locationId) return successResponse(null);

    // Cari paket terakhir yang sudah diambil dan sudah dibayar di lokasi ini
    const pkg = await prisma.package.findFirst({
      where: {
        locationId,
        status: "PICKED",
        payments: {
          some: { status: "COMPLETED" }
        }
      },
      orderBy: { updatedAt: "desc" },
      include: {
        payments: {
          where: { status: "COMPLETED" },
          orderBy: { updatedAt: "desc" },
          take: 1
        }
      }
    });
    if (!pkg || !pkg.payments.length) return successResponse(null);
    return successResponse({ amount: pkg.payments[0].amount, updatedAt: pkg.payments[0].updatedAt });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
