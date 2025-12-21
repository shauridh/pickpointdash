import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";

// GET /api/location-stats?locationId=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    if (!locationId) return errorResponse("locationId required", 400);

    // Paket masuk
    const paketMasuk = await prisma.package.count({ where: { locationId, status: "ARRIVED" } });
    // Paket keluar
    const paketKeluar = await prisma.package.count({ where: { locationId, status: "PICKED" } });
    // Total paket
    const totalPaket = await prisma.package.count({ where: { locationId } });
    // Member aktif
    const now = new Date();
    const memberAktif = await prisma.customer.count({ where: { locationId, isMember: true, membershipExpiry: { gt: now } } });
    // Pendapatan pengantaran
    const pengantaran = await prisma.payment.aggregate({ _sum: { amount: true }, where: { locationId, method: "DELIVERY", status: "COMPLETED" } });
    // Pendapatan member
    const member = await prisma.payment.aggregate({ _sum: { amount: true }, where: { locationId, method: "MEMBERSHIP", status: "COMPLETED" } });
    // Pendapatan paket
    const paket = await prisma.payment.aggregate({ _sum: { amount: true }, where: { locationId, method: { notIn: ["DELIVERY", "MEMBERSHIP"] }, status: "COMPLETED" } });
    // Total pendapatan
    const totalPendapatan = (pengantaran._sum.amount || 0) + (member._sum.amount || 0) + (paket._sum.amount || 0);

    return successResponse({
      paketMasuk,
      paketKeluar,
      totalPaket,
      memberAktif,
      pendapatanPengantaran: pengantaran._sum.amount || 0,
      pendapatanMember: member._sum.amount || 0,
      pendapatanPaket: paket._sum.amount || 0,
      totalPendapatan,
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
