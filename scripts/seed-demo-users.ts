import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { UserRole, SubscriptionTier, SubscriptionStatus } from "@prisma/client"

async function seedDemoUsers() {
  console.log("🌱 Seeding demo users...")

  try {
    // Create demo accounts
    const freeAccount = await prisma.account.upsert({
      where: { id: "demo-free-account" },
      update: {},
      create: {
        id: "demo-free-account",
        name: "Free Demo Company",
        subscriptionTier: SubscriptionTier.FREE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        billingEmail: "free@demo.com",
        currency: "USD"
      }
    })

    const proAccount = await prisma.account.upsert({
      where: { id: "demo-pro-account" },
      update: {},
      create: {
        id: "demo-pro-account",
        name: "Pro Demo Company",
        subscriptionTier: SubscriptionTier.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        billingEmail: "pro@demo.com",
        currency: "USD"
      }
    })

    // Create demo users
    const adminPassword = await hashPassword("admin123")
    const customerPassword = await hashPassword("demo123")

    // Admin user (no account association)
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@demo.com" },
      update: {
        password: adminPassword,
        role: UserRole.ADMIN
      },
      create: {
        email: "admin@demo.com",
        password: adminPassword,
        name: "Admin User",
        role: UserRole.ADMIN,
        accountId: null // Admins don't need account association
      }
    })

    // Free tier customer
    const freeCustomer = await prisma.user.upsert({
      where: { email: "free@demo.com" },
      update: {
        password: customerPassword,
        role: UserRole.CUSTOMER
      },
      create: {
        email: "free@demo.com",
        password: customerPassword,
        name: "Free Customer",
        role: UserRole.CUSTOMER,
        accountId: freeAccount.id
      }
    })

    // Pro tier customer
    const proCustomer = await prisma.user.upsert({
      where: { email: "pro@demo.com" },
      update: {
        password: customerPassword,
        role: UserRole.CUSTOMER
      },
      create: {
        email: "pro@demo.com",
        password: customerPassword,
        name: "Pro Customer",
        role: UserRole.CUSTOMER,
        accountId: proAccount.id
      }
    })

    console.log("✅ Demo users created successfully:")
    console.log("┌─────────────────────────────────────────┐")
    console.log("│ Demo Credentials                        │")
    console.log("├─────────────────────────────────────────┤")
    console.log("│ Admin:                                  │")
    console.log("│   Email: admin@demo.com                 │")
    console.log("│   Password: admin123                    │")
    console.log("│                                         │")
    console.log("│ Free Customer:                          │")
    console.log("│   Email: free@demo.com                  │")
    console.log("│   Password: demo123                     │")
    console.log("│                                         │")
    console.log("│ Pro Customer:                           │")
    console.log("│   Email: pro@demo.com                   │")
    console.log("│   Password: demo123                     │")
    console.log("└─────────────────────────────────────────┘")

  } catch (error) {
    console.error("❌ Error seeding demo users:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedDemoUsers()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })