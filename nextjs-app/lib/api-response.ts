import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export function notFoundResponse(
  message: string = "Resource not found"
): NextResponse<ApiResponse> {
  return errorResponse(message, 404);
}

export function unauthorizedResponse(
  message: string = "Unauthorized"
): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

export function serverErrorResponse(
  error?: unknown
): NextResponse<ApiResponse> {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  console.error("Server error:", error);
  return errorResponse(message, 500);
}
