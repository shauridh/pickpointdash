import { prisma } from "@/lib/db";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    // Paket masuk
    const paketMasuk = await prisma.package.count({ where: { status: "ARRIVED" } });
    // Paket keluar
    const paketKeluar = await prisma.package.count({ where: { status: "PICKED" } });
    // Paket dimusnahkan
    const paketDestroyed = await prisma.package.count({ where: { status: "DESTROYED" } });
    // Total paket
    const totalPaket = await prisma.package.count();
    // Member aktif
    const now = new Date();
    const memberAktif = await prisma.customer.count({ where: { isMember: true, membershipExpiry: { gt: now } } });
    // Lokasi
    const totalLocations = await prisma.location.count();
    // Pendapatan pengantaran
    const pengantaran = await prisma.payment.aggregate({ _sum: { amount: true }, where: { method: "DELIVERY", status: "COMPLETED" } });
    // Pendapatan member
    const member = await prisma.payment.aggregate({ _sum: { amount: true }, where: { method: "MEMBERSHIP", status: "COMPLETED" } });
    // Pendapatan paket
    const paket = await prisma.payment.aggregate({ _sum: { amount: true }, where: { method: { notIn: ["DELIVERY", "MEMBERSHIP"] }, status: "COMPLETED" } });
    // Total pendapatan
    const totalPendapatan = (pengantaran._sum.amount || 0) + (member._sum.amount || 0) + (paket._sum.amount || 0);

    return successResponse({
      totalUsers: memberAktif,
      totalLocations,
      totalPackages: totalPaket,
      totalRevenue: totalPendapatan,
      revenueDelivery: pengantaran._sum.amount || 0,
      revenueSubscription: member._sum.amount || 0,
      revenuePackage: paket._sum.amount || 0,
      packagesByStatus: {
        arrived: paketMasuk,
        picked: paketKeluar,
        destroyed: paketDestroyed,
      },
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
