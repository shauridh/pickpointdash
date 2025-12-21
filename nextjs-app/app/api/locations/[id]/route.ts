import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET location by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            packages: true,
            payments: true,
          },
        },
      },
    });

    if (!location) {
      return notFoundResponse("Location not found");
    }

    return successResponse(location);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT update location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const location = await prisma.location.update({
      where: { id },
      data: body,
    });

    return successResponse(location, "Location updated successfully");
  } catch (error: any) {
    if (error.code === "P2025") {
      return notFoundResponse("Location not found");
    }
    return serverErrorResponse(error);
  }
}

// DELETE location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.location.delete({
      where: { id },
    });

    return successResponse(null, "Location deleted successfully");
  } catch (error: any) {
    if (error.code === "P2025") {
      return notFoundResponse("Location not found");
    }
    return serverErrorResponse(error);
  }
}
