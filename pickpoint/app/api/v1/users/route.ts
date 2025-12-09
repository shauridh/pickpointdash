import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api/response'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    // Verify SUPER_ADMIN role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        ApiResponse.error('Hanya SUPER_ADMIN yang bisa melihat daftar user'),
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      ApiResponse.success(users, 'Data user berhasil diambil')
    )
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}
