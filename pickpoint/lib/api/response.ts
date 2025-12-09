import { NextResponse } from "next/server"

export interface ApiErrorDetail {
  field?: string
  message: string
}

export interface ApiError {
  code: string
  message: string
  details?: ApiErrorDetail[]
}

export interface ApiResponseType<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponseType<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

export function errorResponse(
  code: string,
  message: string,
  details?: ApiErrorDetail[],
  status: number = 400
): NextResponse<ApiResponseType> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  )
}

export function validationError(
  details: ApiErrorDetail[],
  status: number = 400
): NextResponse<ApiResponseType> {
  return errorResponse(
    "VALIDATION_ERROR",
    "Input validation failed",
    details,
    status
  )
}

export function unauthorizedError(): NextResponse<ApiResponseType> {
  return errorResponse(
    "UNAUTHORIZED",
    "Authentication required",
    undefined,
    401
  )
}

export function forbiddenError(): NextResponse<ApiResponseType> {
  return errorResponse(
    "FORBIDDEN",
    "You don't have permission to access this resource",
    undefined,
    403
  )
}

export function notFoundError(resource: string): NextResponse<ApiResponseType> {
  return errorResponse(
    "NOT_FOUND",
    `${resource} not found`,
    undefined,
    404
  )
}

export function serverError(message: string = "Internal server error"): NextResponse<ApiResponseType> {
  return errorResponse(
    "INTERNAL_SERVER_ERROR",
    message,
    undefined,
    500
  )
}

// Utility class for easier API responses
export class ApiResponse {
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      message,
    }
  }

  static error(message: string, details?: any) {
    return {
      success: false,
      message,
      error: details,
    }
  }
}
