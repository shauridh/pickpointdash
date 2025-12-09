const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Create Location Manager
  const hashedPassword = await bcrypt.hash('manager123456', 10)
  
  let manager = await prisma.user.findFirst({
    where: { phone: '6281234567891' },
  })

  if (!manager) {
    manager = await prisma.user.create({
      data: {
        name: 'Budi Manager',
        email: 'budi@pickpoint.id',
        phone: '6281234567891',
        password: hashedPassword,
        role: 'LOCATION_MANAGER',
      },
    })
    console.log('✓ Location Manager dibuat:', manager.name)
  } else {
    console.log('✓ Location Manager sudah ada:', manager.name)
  }

  // Create Location
  let location = await prisma.location.findUnique({
    where: { code: 'APT-A' },
  })

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: 'Apartment Blok A',
        code: 'APT-A',
        address: 'Jalan Merdeka No. 123, Jakarta',
        managerId: manager.id,
        gracePeriodDays: 1,
        priceDayOne: 5000,
        priceNextDay: 3000,
        priceFirstPackage: 5000,
        priceNextPackage: 3000,
        deliveryFee: 10000,
      },
    })
    console.log('✓ Lokasi dibuat:', location.name)
  } else {
    console.log('✓ Lokasi sudah ada:', location.name)
  }

  console.log('\n✓ Seed data berhasil dibuat')
  console.log('\nManager login:')
  console.log('  Email: budi@pickpoint.id')
  console.log('  Password: manager123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
