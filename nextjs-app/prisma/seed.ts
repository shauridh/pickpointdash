import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/pickpoint";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@pickpoint.com" },
    update: {},
    create: {
      email: "admin@pickpoint.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 10);
  const staff = await prisma.user.upsert({
    where: { email: "staff@pickpoint.com" },
    update: {},
    create: {
      email: "staff@pickpoint.com",
      password: staffPassword,
      name: "Staff User",
      role: "STAFF",
    },
  });
  console.log("✅ Created staff user:", staff.email);

  // Create locations
  const locations = [
    {
      name: "Jakarta Pusat",
      code: "JKT01",
      address: "Jl. Merdeka No. 1, Jakarta Pusat",
      phone: "021-1234567",
      pricing: {
        type: "FLAT",
        gracePeriodDays: 1,
        flatRate: 5000,
      },
      enableDelivery: true,
      deliveryFee: 15000,
      enableMembership: true,
      membershipFee: 50000,
    },
    {
      name: "Jakarta Selatan",
      code: "JKT02",
      address: "Jl. Sudirman No. 100, Jakarta Selatan",
      phone: "021-7654321",
      pricing: {
        type: "SIZE",
        gracePeriodDays: 1,
        sizeS: 3000,
        sizeM: 5000,
        sizeL: 8000,
      },
      enableDelivery: true,
      deliveryFee: 20000,
    },
    {
      name: "Bandung",
      code: "BDG01",
      address: "Jl. Diponegoro No. 50, Bandung",
      phone: "022-5555555",
      pricing: {
        type: "PROGRESSIVE",
        gracePeriodDays: 2,
        firstDayRate: 3000,
        nextDayRate: 2000,
      },
      enableDelivery: false,
      deliveryFee: 0,
    },
  ];

  for (const loc of locations) {
    const location = await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
    console.log("✅ Created location:", location.name);
  }

  // Create sample customers
  const customers = [
    {
      name: "Ahmad Rahman",
      phoneNumber: "6281234567890",
      unitNumber: "A-101",
      locationId: 1, // Jakarta Pusat
      isMember: true,
      membershipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    {
      name: "Siti Nurhaliza",
      phoneNumber: "6281987654321",
      unitNumber: "B-205",
      locationId: 1, // Jakarta Pusat
      isMember: false,
    },
    {
      name: "Budi Santoso",
      phoneNumber: "6281122334455",
      unitNumber: "C-301",
      locationId: 2, // Jakarta Selatan
      isMember: true,
      membershipExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    },
    {
      name: "Maya Sari",
      phoneNumber: "6281555666777",
      unitNumber: "D-102",
      locationId: 3, // Bandung
      isMember: false,
    },
  ];

  for (const cust of customers) {
    try {
      const customer = await prisma.customer.create({
        data: cust,
      });
      console.log("✅ Created customer:", customer.name);
    } catch (error) {
      console.log("⚠️ Customer already exists:", cust.name);
    }
  }

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
