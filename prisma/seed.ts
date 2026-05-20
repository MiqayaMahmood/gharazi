import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();


async function main(): Promise<void> {
    
  await seedRoles();
  await seedListingPurposes();
  await seedPropertyTypes();
  await seedAmenities();
  await seedLocations();
  await seedSubscriptionPlans();
  await seedAdminUser();
}

async function seedAdminUser(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'mahmoodrf@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Mrfmm808$$';
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: await bcrypt.hash(password, 12),
      status: 'ACTIVE',
    },
    create: {
      email,
      phoneNumber: '+920000000001',
      passwordHash: await bcrypt.hash(password, 12),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { fullName: 'Seed Admin', preferredLanguage: 'en' } },
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });
}

async function seedRoles(): Promise<void> {
  const roles = [
    { code: 'buyer', name: 'Buyer', description: 'Default customer role' },
    { code: 'tenant', name: 'Tenant', description: 'Rental customer role' },
    { code: 'owner', name: 'Owner', description: 'Property owner role' },
    { code: 'agent', name: 'Agent', description: 'Real estate agent role' },
    { code: 'developer', name: 'Developer', description: 'Developer or builder role' },
    { code: 'moderator', name: 'Moderator', description: 'Content moderation role' },
    { code: 'admin', name: 'Admin', description: 'Platform administration role' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }
}

async function seedListingPurposes(): Promise<void> {
  const purposes = [
    { code: 'sale', name: 'Sale', slug: 'sale', sortOrder: 10 },
    { code: 'rent', name: 'Rent', slug: 'rent', sortOrder: 20 },
  ];

  for (const purpose of purposes) {
    await prisma.listingPurpose.upsert({
      where: { code: purpose.code },
      update: purpose,
      create: purpose,
    });
  }
}

async function seedPropertyTypes(): Promise<void> {
  const propertyTypes = [
    { code: 'house', name: 'House', slug: 'house', category: 'residential', sortOrder: 10 },
    { code: 'apartment', name: 'Apartment', slug: 'apartment', category: 'residential', sortOrder: 20 },
    {
      code: 'upper_portion',
      name: 'Upper Portion',
      slug: 'upper-portion',
      category: 'residential',
      sortOrder: 30,
    },
    {
      code: 'lower_portion',
      name: 'Lower Portion',
      slug: 'lower-portion',
      category: 'residential',
      sortOrder: 40,
    },
    {
      code: 'residential_plot',
      name: 'Residential Plot',
      slug: 'residential-plot',
      category: 'plot',
      sortOrder: 50,
    },
    {
      code: 'commercial_plot',
      name: 'Commercial Plot',
      slug: 'commercial-plot',
      category: 'plot',
      sortOrder: 60,
    },
    { code: 'office', name: 'Office', slug: 'office', category: 'commercial', sortOrder: 70 },
    { code: 'shop', name: 'Shop', slug: 'shop', category: 'commercial', sortOrder: 80 },
    {
      code: 'warehouse',
      name: 'Warehouse',
      slug: 'warehouse',
      category: 'commercial',
      sortOrder: 90,
    },
  ];

  for (const propertyType of propertyTypes) {
    await prisma.propertyType.upsert({
      where: { code: propertyType.code },
      update: propertyType,
      create: propertyType,
    });
  }
}

async function seedAmenities(): Promise<void> {
  const amenities = [
    { code: 'electricity', name: 'Electricity', slug: 'electricity', category: 'utilities', sortOrder: 10 },
    { code: 'gas', name: 'Gas', slug: 'gas', category: 'utilities', sortOrder: 20 },
    {
      code: 'water_supply',
      name: 'Water Supply',
      slug: 'water-supply',
      category: 'utilities',
      sortOrder: 30,
    },
    { code: 'parking', name: 'Parking', slug: 'parking', category: 'features', sortOrder: 40 },
    { code: 'lift', name: 'Lift', slug: 'lift', category: 'features', sortOrder: 45 },
    { code: 'security', name: 'Security', slug: 'security', category: 'features', sortOrder: 50 },
    {
      code: 'generator_backup',
      name: 'Generator Backup',
      slug: 'generator-backup',
      category: 'features',
      sortOrder: 60,
    },
  ];

  for (const amenity of amenities) {
    await prisma.amenityDefinition.upsert({
      where: { code: amenity.code },
      update: amenity,
      create: amenity,
    });
  }
}

async function seedLocations(): Promise<void> {
  const cities = [
    {
      name: 'Lahore',
      slug: 'lahore',
      province: 'Punjab',
      areas: [
        {
          name: 'DHA Lahore',
          slug: 'dha-lahore',
          areaLevel: 'society',
          children: [{ name: 'DHA Phase 6', slug: 'dha-phase-6', areaLevel: 'phase' }],
        },
        { name: 'Bahria Town Lahore', slug: 'bahria-town-lahore', areaLevel: 'society' },
        { name: 'Gulberg', slug: 'gulberg', areaLevel: 'locality' },
      ],
    },
    {
      name: 'Karachi',
      slug: 'karachi',
      province: 'Sindh',
      areas: [
        {
          name: 'DHA Karachi',
          slug: 'dha-karachi',
          areaLevel: 'society',
          children: [{ name: 'DHA Phase 8', slug: 'dha-phase-8', areaLevel: 'phase' }],
        },
        { name: 'Bahria Town Karachi', slug: 'bahria-town-karachi', areaLevel: 'society' },
        { name: 'Clifton', slug: 'clifton', areaLevel: 'locality' },
      ],
    },
    {
      name: 'Islamabad',
      slug: 'islamabad',
      province: 'Islamabad Capital Territory',
      areas: [
        { name: 'DHA Islamabad', slug: 'dha-islamabad', areaLevel: 'society' },
        { name: 'Bahria Town Islamabad', slug: 'bahria-town-islamabad', areaLevel: 'society' },
        {
          name: 'G-11',
          slug: 'g-11',
          areaLevel: 'sector',
          children: [{ name: 'G-11/3', slug: 'g-11-3', areaLevel: 'block' }],
        },
      ],
    },
  ];

  for (const [cityIndex, city] of cities.entries()) {
    const record = await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        province: city.province,
        sortOrder: (cityIndex + 1) * 10,
      },
      create: {
        name: city.name,
        slug: city.slug,
        province: city.province,
        sortOrder: (cityIndex + 1) * 10,
      },
    });

    for (const [areaIndex, area] of city.areas.entries()) {
      const parentArea = await prisma.area.upsert({
        where: {
          cityId_slug: {
            cityId: record.id,
            slug: area.slug,
          },
        },
        update: {
          name: area.name,
          areaLevel: area.areaLevel,
          parentAreaId: null,
          sortOrder: (areaIndex + 1) * 10,
        },
        create: {
          cityId: record.id,
          name: area.name,
          slug: area.slug,
          areaLevel: area.areaLevel,
          sortOrder: (areaIndex + 1) * 10,
        },
      });

      for (const [childIndex, childArea] of (area.children ?? []).entries()) {
        await prisma.area.upsert({
          where: {
            cityId_slug: {
              cityId: record.id,
              slug: childArea.slug,
            },
          },
          update: {
            name: childArea.name,
            areaLevel: childArea.areaLevel,
            parentAreaId: parentArea.id,
            sortOrder: (childIndex + 1) * 10,
          },
          create: {
            cityId: record.id,
            parentAreaId: parentArea.id,
            name: childArea.name,
            slug: childArea.slug,
            areaLevel: childArea.areaLevel,
            sortOrder: (childIndex + 1) * 10,
          },
        });
      }
    }
  }
}

async function seedSubscriptionPlans(): Promise<void> {
  const plans = [
    {
      code: 'basic_monthly',
      name: 'Basic Monthly',
      billingInterval: 'monthly',
      priceAmount: 0,
      featuresJson: { listingsPerMonth: 3, featuredCredits: 0 },
    },
    {
      code: 'agent_monthly',
      name: 'Agent Monthly',
      billingInterval: 'monthly',
      priceAmount: 4999,
      featuresJson: { listingsPerMonth: 50, featuredCredits: 3 },
    },
    {
      code: 'developer_yearly',
      name: 'Developer Yearly',
      billingInterval: 'yearly',
      priceAmount: 99999,
      featuresJson: { projects: true, listingsPerMonth: 500, featuredCredits: 25 },
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
