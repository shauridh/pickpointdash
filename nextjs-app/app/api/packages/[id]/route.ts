import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET package by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        location: true,
        payments: true,
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pkg) {
      return notFoundResponse("Package not found");
    }

    return successResponse(pkg);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT update package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, ...otherData } = body;

    const pkg = await prisma.package.update({
      where: { id },
      data: {
        ...otherData,
        ...(status && { status }),
      },
      include: {
        location: true,
      },
    });

    // Log activity if status changed
    if (status) {
      await prisma.activity.create({
        data: {
          packageId: pkg.id,
          type:
            status === "PICKED"
              ? "PACKAGE_PICKED"
              : status === "DESTROYED"
              ? "PACKAGE_DESTROYED"
              : "PACKAGE_ARRIVED",
          description: `Package status changed to ${status}`,
        },
      });
    }

    return successResponse(pkg, "Package updated successfully");
  } catch (error: any) {
    if (error.code === "P2025") {
      return notFoundResponse("Package not found");
    }
    return serverErrorResponse(error);
  }
}

// DELETE package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.package.delete({
      where: { id },
    });

    return successResponse(null, "Package deleted successfully");
  } catch (error: any) {
    if (error.code === "P2025") {
      return notFoundResponse("Package not found");
    }
    return serverErrorResponse(error);
  }
}
