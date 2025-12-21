import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-response";

// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name) {
      return errorResponse("Email, password, and name are required");
    }

    const user = await prisma.user.create({
      data: {
        email,
        password, // Should be hashed
        name,
        role: role || "STAFF",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(user, "User created successfully");
  } catch (error: any) {
    if (error.code === "P2002") {
      return errorResponse("Email already exists", 409);
    }
    return serverErrorResponse(error);
  }
}
