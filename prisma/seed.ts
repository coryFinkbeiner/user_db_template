import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Idempotent seed: creates or leaves existing record
  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  })
  console.log('Seed complete: demo@example.com')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

