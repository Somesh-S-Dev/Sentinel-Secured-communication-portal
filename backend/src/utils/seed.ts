import * as dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

async function seed() {
  console.log('🌱 Seeding Sentinel database...');

  // ─── Channels ──────────────────────────────────────────────────────────────
  const channels = [
    { slug: 'general-reports',  displayName: 'General Reports',  type: 'GENERAL'     as const, description: 'General incident reports and observations' },
    { slug: 'hr-concerns',      displayName: 'HR Concerns',      type: 'HR'          as const, description: 'Workplace conduct, discrimination, harassment' },
    { slug: 'safety-incidents', displayName: 'Safety Incidents', type: 'SAFETY'      as const, description: 'Physical safety risks and near-miss events' },
    { slug: 'policy-violations',displayName: 'Policy Violations',type: 'POLICY'      as const, description: 'Breaches of company policy or code of conduct' },
    { slug: 'it-security',      displayName: 'IT Security',      type: 'IT_SECURITY' as const, description: 'Cybersecurity threats, data breaches, misuse' },
    { slug: 'legal-compliance', displayName: 'Legal & Compliance',type: 'LEGAL'      as const, description: 'Legal violations, fraud, conflicts of interest' },
  ];

  for (const ch of channels) {
    await prisma.channel.upsert({
      where:  { slug: ch.slug },
      update: {},
      create: ch,
    });
  }
  console.log(`✅ ${channels.length} channels seeded`);

  // ─── Super Admin ───────────────────────────────────────────────────────────
  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME ?? 'superadmin';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe@2025!';
  const superAdminDisplay  = process.env.SUPER_ADMIN_DISPLAY  ?? 'Super Administrator';

  const existing = await prisma.admin.findUnique({ where: { username: superAdminUsername } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);
    await prisma.admin.create({
      data: {
        username:    superAdminUsername,
        passwordHash,
        displayName: superAdminDisplay,
        role:        'SUPER_ADMIN',
      },
    });
    console.log(`✅ Super admin created: ${superAdminUsername}`);
    console.log(`⚠️  Change the password immediately after first login`);
  } else {
    console.log(`ℹ️  Super admin already exists — skipping`);
  }

  console.log('🎉 Seed complete');
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
});
