import { describe, expect, test } from "bun:test";
import type {
  EvaluationPlacement,
  EvaluationRecord,
  EvaluationRepository,
} from "./evaluation.repository";
import { EvaluationService } from "./evaluation.service";
describe("EvaluationService", () => {
  test("creates one draft for each assigned evaluator type", async () => {
    const r = new MemoryEvaluationRepository();
    expect(await save(r, "advisor")).toMatchObject({
      evaluatorType: "advisor",
      status: "draft",
    });
    expect(await save(r, "supervisor")).toMatchObject({
      evaluatorType: "supervisor",
    });
  });
  test("rejects an unassigned evaluator", async () => {
    expect(
      save(new MemoryEvaluationRepository(), "outsider"),
    ).rejects.toMatchObject({ code: "EVALUATOR_REQUIRED" });
  });
  test("locks an evaluation after submission", async () => {
    const r = new MemoryEvaluationRepository();
    const created = await save(r, "advisor");
    await new EvaluationService(r).submit("advisor", created.id);
    expect(save(r, "advisor")).rejects.toMatchObject({
      code: "EVALUATION_IMMUTABLE",
    });
  });
  test("hides draft evaluations from the student", async () => {
    const r = new MemoryEvaluationRepository();
    await save(r, "advisor");
    expect(await new EvaluationService(r).list("student", "placement")).toEqual(
      [],
    );
  });
  test("notifies the student when an evaluation is submitted", async () => {
    const repository = new MemoryEvaluationRepository();
    const created = await save(repository, "advisor");
    const notifications: unknown[] = [];
    await new EvaluationService(repository, () => new Date(), {
      async notify(input) {
        notifications.push(input);
      },
    }).submit("advisor", created.id);
    expect(notifications).toHaveLength(1);
  });
});
class MemoryEvaluationRepository implements EvaluationRepository {
  placement: EvaluationPlacement = {
    id: "placement",
    studentUserId: "student",
    advisorUserId: "advisor",
    supervisorUserId: "supervisor",
    status: "active",
  };
  records: EvaluationRecord[] = [];
  async findPlacement(id: string) {
    return id === "placement" ? this.placement : undefined;
  }
  async findByType(id: string, type: "advisor" | "supervisor") {
    return this.records.find(
      (r) => r.placementId === id && r.evaluatorType === type,
    );
  }
  async findById(id: string) {
    return this.records.find((r) => r.id === id);
  }
  async create(input: Parameters<EvaluationRepository["create"]>[0]) {
    const r = evaluation(input);
    this.records.push(r);
    return r;
  }
  async update(
    id: string,
    changes: Parameters<EvaluationRepository["update"]>[1],
  ) {
    const r = this.records.find((x) => x.id === id)!;
    Object.assign(r, changes);
    return r;
  }
  async list(id: string) {
    return this.records.filter((r) => r.placementId === id);
  }
}
function save(repo: EvaluationRepository, actor: string) {
  return new EvaluationService(repo).save(actor, "placement", {
    technicalScore: 4,
    communicationScore: 5,
    responsibilityScore: 4,
    comment: "Strong performance throughout the internship.",
  });
}
function evaluation(
  input: Parameters<EvaluationRepository["create"]>[0],
): EvaluationRecord {
  const now = new Date();
  return {
    id: `evaluation-${input.evaluatorType}`,
    status: "draft",
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}
