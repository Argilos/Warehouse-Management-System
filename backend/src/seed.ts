import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing all data from the database...\n');

  // ─── CLEAN ALL DATA (order matters for FK constraints) ────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.inventoryCheckItem.deleteMany();
  await prisma.inventoryCheck.deleteMany();
  await prisma.document.deleteMany();
  await prisma.calibrationRecord.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.toolBoxItem.deleteMany();
  await prisma.toolBox.deleteMany();
  await prisma.employeeAsset.deleteMany();
  await prisma.assetTransaction.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Database clear failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
