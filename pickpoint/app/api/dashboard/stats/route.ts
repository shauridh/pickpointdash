import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stats dari database
    const [totalUsers, totalLocations, totalPackages] = await Promise.all([
      prisma.user.count(),
      prisma.location.count(),
      prisma.package.count(),
    ])

    // Calculate revenue bulan ini (simplified - bisa disesuaikan dengan logic bisnis)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyRevenue = await prisma.package.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        price: true,
      },
    })

    return NextResponse.json({
      totalUsers,
      totalLocations,
      totalPackages,
      monthlyRevenue: monthlyRevenue._sum.price || 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
