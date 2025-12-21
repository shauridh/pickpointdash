import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEMPLATE_KEY = "whatsapp_notification_template";

// GET handler to fetch the current template
export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: TEMPLATE_KEY },
    });

    const template = setting?.value || "Halo {{namaPenerima}}, paket Anda dengan nomor resi {{nomorResi}} telah tiba di PickPoint. Silakan diambil.";

    return NextResponse.json({ success: true, template });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch template." },
      { status: 500 }
    );
  }
}

// POST handler to update or create the template
export async function POST(request: Request) {
  try {
    const { template } = await request.json();

    if (typeof template !== 'string' || template.trim() === '') {
        return NextResponse.json(
            { success: false, error: "Template content is required." },
            { status: 400 }
        );
    }

    await prisma.setting.upsert({
      where: { key: TEMPLATE_KEY },
      update: { value: template },
      create: { key: TEMPLATE_KEY, value: template },
    });

    return NextResponse.json({ success: true, message: "Template saved successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to save template." },
      { status: 500 }
    );
  }
}
