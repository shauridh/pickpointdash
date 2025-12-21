import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

// GET activities
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageId = searchParams.get("packageId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const activities = await prisma.activity.findMany({
      where: {
        ...(packageId && { packageId }),
      },
      include: {
        package: {
          select: {
            trackingCode: true,
            receiverName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return successResponse(activities);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
