import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const allowDevBypass = process.env.DEBUG === "true";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session && !allowDevBypass) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entries = Object.entries(body as Record<string, unknown>);
    if (entries.length === 0) {
      return NextResponse.json({ success: false, error: "No settings provided" }, { status: 400 });
    }

    const ops = entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value ?? "") },
        create: { key, value: String(value ?? "") },
      })
    );

    const results = await prisma.$transaction(ops);
    const data = results.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API/settings/bulk][PUT]", error);
    return NextResponse.json({ success: false, error: (error as any)?.message || "Failed to save settings." }, { status: 500 });
  }
}