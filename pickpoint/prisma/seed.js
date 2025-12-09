const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Check if super admin exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  })

  if (existingAdmin) {
    console.log('Super admin sudah ada:', existingAdmin.name)
    return
  }

  // Create super admin
  const hashedPassword = await bcrypt.hash('admin123456', 10)
  
  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@pickpoint.id',
      phone: '6281234567890',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✓ Super admin berhasil dibuat:')
  console.log('  Email: admin@pickpoint.id')
  console.log('  Password: admin123456')
  console.log('  Gunakan untuk login pertama kali')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
