import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api/response'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    const location = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        staffs: {
          select: { id: true, name: true, email: true, unitNumber: true },
        },
      },
    })

    if (!location) {
      return NextResponse.json(
        ApiResponse.error('Lokasi tidak ditemukan'),
        { status: 404 }
      )
    }

    // Verify user punya akses ke lokasi ini
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (
      user?.role !== 'SUPER_ADMIN' &&
      location.managerId !== session.user.id
    ) {
      return NextResponse.json(
        ApiResponse.error('Anda tidak memiliki akses ke lokasi ini'),
        { status: 403 }
      )
    }

    return NextResponse.json(
      ApiResponse.success(location, 'Detail lokasi berhasil diambil')
    )
  } catch (error) {
    console.error('Get location error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        ApiResponse.error('Unauthorized'),
        { status: 401 }
      )
    }

    const location = await prisma.location.findUnique({
      where: { id: params.id },
    })

    if (!location) {
      return NextResponse.json(
        ApiResponse.error('Lokasi tidak ditemukan'),
        { status: 404 }
      )
    }

    // Verify user punya akses
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (
      user?.role !== 'SUPER_ADMIN' &&
      location.managerId !== session.user.id
    ) {
      return NextResponse.json(
        ApiResponse.error('Anda tidak memiliki akses ke lokasi ini'),
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      name,
      address,
      gracePeriodDays,
      priceDayOne,
      priceNextDay,
      priceFirstPackage,
      priceNextPackage,
      deliveryFee,
    } = body

    const updatedLocation = await prisma.location.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(gracePeriodDays !== undefined && { gracePeriodDays }),
        ...(priceDayOne !== undefined && { priceDayOne }),
        ...(priceNextDay !== undefined && { priceNextDay }),
        ...(priceFirstPackage !== undefined && { priceFirstPackage }),
        ...(priceNextPackage !== undefined && { priceNextPackage }),
        ...(deliveryFee !== undefined && { deliveryFee }),
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(
      ApiResponse.success(updatedLocation, 'Lokasi berhasil diupdate')
    )
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json(
      ApiResponse.error('Internal server error'),
      { status: 500 }
    )
  }
}
