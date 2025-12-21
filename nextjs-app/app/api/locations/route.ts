import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET all locations
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: "desc" },
    });

    return successResponse(locations);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST create location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      pricing,
      enableDelivery,
      deliveryFee,
      gracePeriod,
    } = body;

    if (!name || !pricing) {
      return errorResponse("Name and pricing are required");
    }

    const location = await prisma.location.create({
      data: {
        name,
        pricing,
        enableDelivery: enableDelivery ?? false,
        deliveryFee: deliveryFee ?? 0,
        gracePeriod: gracePeriod ?? 0,
      },
    });

    return successResponse(location, "Location created successfully");
  } catch (error: any) {
    if (error.code === "P2002") {
      return errorResponse("Location code already exists", 409);
    }
    return serverErrorResponse(error);
  }
}
