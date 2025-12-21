import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { trackingCode: string } }
) {
  try {
    const { trackingCode } = params;

    if (!trackingCode) {
      return NextResponse.json(
        { success: false, error: "Tracking code is required." },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.findUnique({
      where: {
        trackingCode: trackingCode,
      },
      include: {
        location: true, // Include location details
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Package not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pkg });
  } catch (error) {
    console.error("Error fetching package by tracking code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch package data." },
      { status: 500 }
    );
  }
}
