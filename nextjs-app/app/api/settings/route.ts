
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const allowDevBypass = process.env.DEBUG === "true";

// Helper to get session in App Router API
async function getSession() {
  return await getServerSession(authOptions);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session && !allowDevBypass) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    return NextResponse.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error("[API/settings][GET]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session && !allowDevBypass) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "Key and value are required" }, { status: 400 });
    }
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error("[API/settings][POST]", error);
    return NextResponse.json({ success: false, error: (error as any)?.message || "Failed to save setting." }, { status: 500 });
  }
}