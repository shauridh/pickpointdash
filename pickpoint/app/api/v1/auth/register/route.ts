import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { userRegisterSchema } from '@/lib/validations/schemas'
import bcrypt from 'bcryptjs'
import { ApiResponse } from '@/lib/api/response'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated and is SUPER_ADMIN
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (admin?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        ApiResponse.error('Hanya SUPER_ADMIN yang bisa membuat user'),
        { status: 403 }
      )
    }

    const body = await req.json()

    // Validate input
    const result = userRegisterSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        ApiResponse.error('Validation failed', result.error.flatten()),
        { status: 400 }
      )
    }

    const { email, phone, name, password, role = 'RESIDENT' } = result.data

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        ApiResponse.error('Email atau nomor HP sudah terdaftar'),
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      ApiResponse.success(user, 'User berhasil didaftarkan'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}
