import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET all payments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");

    const payments = await prisma.payment.findMany({
      where: {
        ...(locationId && { locationId }),
        ...(status && { status }),
      },
      include: {
        package: true,
        location: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(payments);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST create payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageId, locationId, amount, method, status, notes } = body;

    if (!locationId) {
      return errorResponse("Location ID is required");
    }

    // method is required unless marking as COMPLETED (lunas)
    if (!method && status !== 'COMPLETED') {
      return errorResponse("Method is required unless status is COMPLETED");
    }

    const payment = await prisma.payment.create({
      data: {
        packageId,
        locationId,
        amount: amount || 0,
        method: method || 'ADMIN',
        status: status || "PENDING",
        notes,
      },
      include: {
        package: true,
        location: true,
      },
    });

    // Log activity if linked to package
    if (packageId) {
      await prisma.activity.create({
        data: {
          packageId,
          type: "PAYMENT_RECEIVED",
          description: `Payment of ${amount || 0} ${status === 'COMPLETED' ? 'marked as COMPLETED' : 'received'} via ${method || 'ADMIN'}`,
        },
      });
    }

    return successResponse(payment, "Payment created successfully");
  } catch (error) {
    return serverErrorResponse(error);
  }
}
