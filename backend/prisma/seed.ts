import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.organization.findFirst();
  if (existing) {
    console.log("Seed already applied");
    return;
  }
  const org = await prisma.organization.create({
    data: { name: "Demo Organization" },
  });
  const password = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email: "owner@example.com",
      password,
      name: "Owner",
      role: "OWNER",
      organizationId: org.id,
    },
  });
  console.log("Seed created: owner@example.com / password123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
