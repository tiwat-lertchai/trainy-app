// One-time/idempotent seed data for local and staging environments. Every
// insert uses onConflictDoNothing so the script can be re-run safely.
import { closeDatabase, db } from "../db";
import { academicFaculty, academicMajor, organization } from "../db/schema";

const universities = [
  {
    name: "มหาวิทยาลัยราชภัฏจันทรเกษม",
    slug: "chandrakasem-rajabhat-university",
    faculties: [
      { name: "คณะครุศาสตร์", majors: [] as string[] },
      { name: "คณะมนุษยศาสตร์และสังคมศาสตร์", majors: [] as string[] },
      { name: "คณะวิทยาศาสตร์", majors: ["วิทยาการคอมพิวเตอร์", "เทคโนโลยีสารสนเทศ"] },
      { name: "คณะวิทยาการจัดการ", majors: ["บริหารธุรกิจ"] },
      { name: "คณะเกษตรและชีวภาพ", majors: [] as string[] },
    ],
  },
];

async function seed() {
  for (const university of universities) {
    const [org] = await db
      .insert(organization)
      .values({ type: "university", name: university.name, slug: university.slug })
      .onConflictDoNothing({ target: organization.slug })
      .returning();
    const organizationId = org?.id ?? (await db.query.organization.findFirst({ where: (table, { eq }) => eq(table.slug, university.slug) }))?.id;
    if (!organizationId) throw new Error(`Could not resolve organization id for ${university.slug}`);

    for (const facultyEntry of university.faculties) {
      const [inserted] = await db
        .insert(academicFaculty)
        .values({ organizationId, name: facultyEntry.name })
        .onConflictDoNothing({ target: [academicFaculty.organizationId, academicFaculty.name] })
        .returning();
      const facultyId = inserted?.id ?? (await db.query.academicFaculty.findFirst({ where: (table, { and, eq }) => and(eq(table.organizationId, organizationId), eq(table.name, facultyEntry.name)) }))?.id;
      if (!facultyId) throw new Error(`Could not resolve faculty id for ${facultyEntry.name}`);

      for (const majorName of facultyEntry.majors) {
        await db.insert(academicMajor).values({ facultyId, name: majorName }).onConflictDoNothing({ target: [academicMajor.facultyId, academicMajor.name] });
      }
    }

    console.log(`Seeded ${university.name}`);
  }
}

seed()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error(error);
    await closeDatabase();
    process.exit(1);
  });
