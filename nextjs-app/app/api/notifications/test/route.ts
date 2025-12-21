import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phoneNumber, template } = await request.json();

    if (!phoneNumber || !template) {
      return NextResponse.json(
        { success: false, error: "Phone number and template are required." },
        { status: 400 }
      );
    }

    // In a real application, you would integrate with a WhatsApp service provider here.
    // For this simulation, we'll just log the action to the console.
    console.log("--- SIMULATING TEST NOTIFICATION ---");
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${template}`);
    console.log("------------------------------------");

    // Simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ success: true, message: `Test notification simulated for ${phoneNumber}.` });

  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test notification." },
      { status: 500 }
    );
  }
}
