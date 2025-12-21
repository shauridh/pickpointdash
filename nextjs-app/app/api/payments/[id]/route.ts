import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET payment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        package: true,
        location: true,
      },
    });

    if (!payment) {
      return notFoundResponse("Payment not found");
    }

    return successResponse(payment);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT update payment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const payment = await prisma.payment.update({
      where: { id },
      data: body,
      include: {
        package: true,
        location: true,
      },
    });

    return successResponse(payment, "Payment updated successfully");
  } catch (error: any) {
    if (error.code === "P2025") {
      return notFoundResponse("Payment not found");
    }
    return serverErrorResponse(error);
  }
}

// DELETE payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.payment.delete({
      where: { id },
    });

    return successResponse(null, "Payment deleted successfully");
  } catch (error: any) {
    if (error.code === "P2025") {
      return notFoundResponse("Payment not found");
    }
    return serverErrorResponse(error);
  }
}
