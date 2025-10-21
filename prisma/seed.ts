import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@rebootthefuture.org' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@rebootthefuture.org',
      password_hash: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });