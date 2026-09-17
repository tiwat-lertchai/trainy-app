// One-time/idempotent seed data for local and staging environments. Every
// insert uses onConflictDoNothing so the script can be re-run safely.
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "../db";
import {
  academicFaculty,
  academicMajor,
  evaluationComponent,
  evaluationCriterion,
  evaluationScheme,
  organization,
} from "../db/schema";
import { universities } from "./seed-academic-data";

const legacyChandrakasemMajors = ["วิทยาการคอมพิวเตอร์", "เทคโนโลยีสารสนเทศ", "บริหารธุรกิจ"];

async function migrateLegacyChandrakasemSeed(organizationId: string) {
  const legacyFaculty = await db.query.academicFaculty.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.organizationId, organizationId), eq(table.name, "คณะครุศาสตร์")),
  });
  const currentFaculty = await db.query.academicFaculty.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.organizationId, organizationId), eq(table.name, "คณะศึกษาศาสตร์")),
  });

  if (legacyFaculty && !currentFaculty) {
    await db
      .update(academicFaculty)
      .set({ name: "คณะศึกษาศาสตร์" })
      .where(eq(academicFaculty.id, legacyFaculty.id));
  }

  await db
    .delete(academicMajor)
    .where(
      and(
        inArray(academicMajor.name, legacyChandrakasemMajors),
        inArray(
          academicMajor.facultyId,
          db
            .select({ id: academicFaculty.id })
            .from(academicFaculty)
            .where(eq(academicFaculty.organizationId, organizationId)),
        ),
      ),
    );
}

const cwie14SupervisorCriteria = [
  "Quantity of work",
  "Quality of work",
  "Academic ability and applied knowledge",
  "Judgment and decision making",
  "Organization and planning",
  "Communication skills",
  "Responsibility and dependability",
  "Interest in work",
  "Interpersonal skills",
  "Ethics and morality",
];

async function seedEvaluationScheme(organizationId: string, track: "regular" | "cooperative") {
  const [inserted] = await db
    .insert(evaluationScheme)
    .values({
      universityOrganizationId: organizationId,
      track,
      name: `CWIE 14 (${track})`,
      version: 1,
    })
    .onConflictDoNothing({
      target: [
        evaluationScheme.universityOrganizationId,
        evaluationScheme.track,
        evaluationScheme.version,
      ],
    })
    .returning();
  const scheme =
    inserted ??
    (await db.query.evaluationScheme.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.universityOrganizationId, organizationId),
          eq(table.track, track),
          eq(table.version, 1),
        ),
    }));
  if (!scheme) throw new Error(`Could not resolve ${track} evaluation scheme`);

  const definitions = [
    {
      evaluatorType: "supervisor" as const,
      label: "Workplace supervisor assessment",
      maxScore: 50,
      criteria: cwie14SupervisorCriteria.map((label) => ({ label, maxScore: 5 })),
    },
    {
      evaluatorType: "advisor" as const,
      label: "Academic advisor assessment",
      maxScore: 40,
      criteria: [{ label: "CWIE supervision assessment", maxScore: 40 }],
    },
    {
      evaluatorType: "center_head" as const,
      label: "Pre-internship orientation attendance",
      maxScore: 5,
      criteria: [{ label: "Orientation participation", maxScore: 5 }],
    },
    {
      evaluatorType: "program_committee" as const,
      label: "Post-internship orientation attendance",
      maxScore: 5,
      criteria: [{ label: "Closing orientation participation", maxScore: 5 }],
    },
  ];
  for (const [sortOrder, definition] of definitions.entries()) {
    const [created] = await db
      .insert(evaluationComponent)
      .values({ schemeId: scheme.id, sortOrder: sortOrder + 1, ...definition })
      .onConflictDoNothing({
        target: [evaluationComponent.schemeId, evaluationComponent.evaluatorType],
      })
      .returning();
    const component =
      created ??
      (await db.query.evaluationComponent.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.schemeId, scheme.id), eq(table.evaluatorType, definition.evaluatorType)),
      }));
    if (!component) throw new Error(`Could not resolve ${definition.evaluatorType} component`);
    await db
      .insert(evaluationCriterion)
      .values(
        definition.criteria.map((criterion, index) => ({
          componentId: component.id,
          sortOrder: index + 1,
          ...criterion,
        })),
      )
      .onConflictDoNothing({
        target: [evaluationCriterion.componentId, evaluationCriterion.sortOrder],
      });
  }
}

async function seed() {
  for (const university of universities) {
    const [org] = await db
      .insert(organization)
      .values({ type: "university", name: university.name, slug: university.slug })
      .onConflictDoNothing({ target: organization.slug })
      .returning();
    const organizationId =
      org?.id ??
      (
        await db.query.organization.findFirst({
          where: (table, { eq }) => eq(table.slug, university.slug),
        })
      )?.id;
    if (!organizationId)
      throw new Error(`Could not resolve organization id for ${university.slug}`);

    if (university.slug === "chandrakasem-rajabhat-university") {
      await migrateLegacyChandrakasemSeed(organizationId);
    }

    for (const facultyEntry of university.faculties) {
      const [inserted] = await db
        .insert(academicFaculty)
        .values({ organizationId, name: facultyEntry.name })
        .onConflictDoNothing({ target: [academicFaculty.organizationId, academicFaculty.name] })
        .returning();
      const facultyId =
        inserted?.id ??
        (
          await db.query.academicFaculty.findFirst({
            where: (table, { and, eq }) =>
              and(eq(table.organizationId, organizationId), eq(table.name, facultyEntry.name)),
          })
        )?.id;
      if (!facultyId) throw new Error(`Could not resolve faculty id for ${facultyEntry.name}`);

      for (const majorName of facultyEntry.majors) {
        await db
          .insert(academicMajor)
          .values({ facultyId, name: majorName })
          .onConflictDoNothing({ target: [academicMajor.facultyId, academicMajor.name] });
      }
    }

    await seedEvaluationScheme(organizationId, "regular");
    await seedEvaluationScheme(organizationId, "cooperative");

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
