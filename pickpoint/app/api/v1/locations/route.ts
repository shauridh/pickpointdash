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

    // SUPER_ADMIN bisa lihat semua lokasi
    // LOCATION_MANAGER hanya bisa lihat lokasi yang dia manage
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    let locations

    if (user?.role === 'SUPER_ADMIN') {
      locations = await prisma.location.findMany({
        include: {
          manager: {
            select: { id: true, name: true, email: true },
          },
          staffs: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (user?.role === 'LOCATION_MANAGER') {
      locations = await prisma.location.findMany({
        where: { managerId: session.user.id },
        include: {
          manager: {
            select: { id: true, name: true, email: true },
          },
          staffs: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      return NextResponse.json(
        ApiResponse.error('Hanya SUPER_ADMIN dan LOCATION_MANAGER yang bisa melihat lokasi'),
        { status: 403 }
      )
    }

    return NextResponse.json(
      ApiResponse.success(locations, 'Data lokasi berhasil diambil')
    )
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    // Hanya SUPER_ADMIN yang bisa buat lokasi baru
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        ApiResponse.error('Hanya SUPER_ADMIN yang bisa membuat lokasi baru'),
        { status: 403 }
      )
    }

    const body = await req.json()
    const { name, code, address, managerId } = body

    if (!name || !code || !address || !managerId) {
      return NextResponse.json(
        ApiResponse.error('nama, code, address, dan managerId harus diisi'),
        { status: 400 }
      )
    }

    // Cek apakah manager exist dan role LOCATION_MANAGER
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    })

    if (!manager || manager.role !== 'LOCATION_MANAGER') {
      return NextResponse.json(
        ApiResponse.error('Manager harus berole LOCATION_MANAGER'),
        { status: 400 }
      )
    }

    // Cek apakah code sudah ada
    const existingLocation = await prisma.location.findUnique({
      where: { code },
    })

    if (existingLocation) {
      return NextResponse.json(
        ApiResponse.error('Code lokasi sudah digunakan'),
        { status: 409 }
      )
    }

    const location = await prisma.location.create({
      data: {
        name,
        code,
        address,
        managerId,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(
      ApiResponse.success(location, 'Lokasi berhasil dibuat'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}
