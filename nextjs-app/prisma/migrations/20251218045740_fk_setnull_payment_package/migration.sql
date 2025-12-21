-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_locationId_fkey";

-- DropForeignKey
ALTER TABLE "Package" DROP CONSTRAINT "Package_locationId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_locationId_fkey";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Package" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
