import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed in production environment. Aborting.');
    process.exit(1);
  }

  // Admin credentials from environment variables
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
    process.exit(1);
  }

  // Hash the password before saving
  const password_hash = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log(`⚠️ Admin with email "${email}" already exists. Skipping creation.`);
  } else {
    await prisma.admin.create({
      data: {
        email,
        name,
        password_hash,
        role: 'admin', // optional, defaults to 'admin'
      },
    });

    console.log(`✅ Admin "${email}" created successfully.`);
  }

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
