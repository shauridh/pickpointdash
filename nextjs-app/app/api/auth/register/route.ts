import { NextRequest } from "next/server";
import { createUser, getUserByEmail } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name) {
      return errorResponse("Email, password, and name are required");
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return errorResponse("User already exists", 409);
    }

    // Create user
    const user = await createUser(email, password, name, role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(
      { user: userWithoutPassword },
      "User registered successfully"
    );
  } catch (error) {
    console.error("Registration error:", error);
    return errorResponse("Registration failed", 500);
  }
}
