import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        unitNumber: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        ApiResponse.error('User not found'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      ApiResponse.success(user, 'Profile berhasil diambil')
    )
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, unitNumber } = body

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(unitNumber && { unitNumber }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        unitNumber: true,
        role: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      ApiResponse.success(user, 'Profile berhasil diupdate')
    )
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}
