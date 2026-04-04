/**
 * Run: npx tsx delete-records.ts
 * Use this to delete Donor or Initiative records safely.
 */
import { prisma } from './src/client'

async function main() {
  // ── LIST ALL DONORS ──────────────────────────────────────────────────────
  const donors = await prisma.donor.findMany({
    select: { id: true, orgName: true, type: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  console.log('\n=== DONORS ===')
  donors.forEach((d, i) => console.log(`[${i}] id=${d.id} | ${d.orgName ?? 'Individual'} | ${d.type} | ${d.createdAt.toLocaleDateString()}`))

  // ── LIST ALL INITIATIVES ─────────────────────────────────────────────────
  const initiatives = await prisma.initiative.findMany({
    select: { id: true, title: true, ngoId: true, sector: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  console.log('\n=== INITIATIVES ===')
  initiatives.forEach((n, i) => console.log(`[${i}] id=${n.id} | ${n.title} | ngoId=${n.ngoId ?? '—'} | ${n.sector}`))

  // ── DELETE ───────────────────────────────────────────────────────────────
  // To delete a specific donor, uncomment and set the id:
  // const deletedDonor = await prisma.donor.delete({ where: { id: 'PASTE_DONOR_ID_HERE' } })
  // console.log('\nDeleted donor:', deletedDonor.id)

  // To delete a specific initiative, uncomment and set the id:
  // const deletedInit = await prisma.initiative.delete({ where: { id: 'PASTE_INITIATIVE_ID_HERE' } })
  // console.log('\nDeleted initiative:', deletedInit.id)

  // To delete ALL donors (careful!):
  // await prisma.donor.deleteMany({})
  // console.log('\nAll donors deleted')

  // To delete ALL initiatives (careful!):
  // await prisma.initiative.deleteMany({})
  // console.log('\nAll initiatives deleted')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
