import { describe, expect, test } from "bun:test";
import type { RubricRepository } from "./rubric.repository";
import { RubricEvaluationService } from "./rubric.service";

const criteria = [
  { id: "11111111-1111-4111-8111-111111111111", maxScore: 5 },
  { id: "22222222-2222-4222-8222-222222222222", maxScore: 5 },
];

describe("RubricEvaluationService", () => {
  test("saves a complete configured rubric and calculates the submitted result", async () => {
    const repository = memoryRepository();
    const service = new RubricEvaluationService(repository);
    const saved = await service.save("supervisor", {
      placementId: "placement",
      componentId: "component",
      comment: "Good work",
      scores: criteria.map((item) => ({ criterionId: item.id, score: 5 })),
    });
    await service.submit("supervisor", saved.id);
    const result = await service.result("student", "placement");
    expect(result).toMatchObject({ total: 10, maximum: 10, complete: true });
    expect(result.grade).toEqual({ letter: "F", points: 0 });
  });

  test("rejects omitted, duplicate, unknown, and over-limit criterion scores", async () => {
    const service = new RubricEvaluationService(memoryRepository());
    for (const scores of [
      [{ criterionId: criteria[0]!.id, score: 5 }],
      criteria.map(() => ({ criterionId: criteria[0]!.id, score: 5 })),
      [
        { criterionId: criteria[0]!.id, score: 6 },
        { criterionId: criteria[1]!.id, score: 5 },
      ],
    ]) {
      expect(
        service.save("supervisor", {
          placementId: "placement",
          componentId: "component",
          comment: "",
          scores,
        }),
      ).rejects.toMatchObject({ statusCode: 422, code: "INVALID_EVALUATION_SCORES" });
    }
  });

  test("enforces evaluator assignment and submitted immutability", async () => {
    const service = new RubricEvaluationService(memoryRepository());
    const input = {
      placementId: "placement",
      componentId: "component",
      comment: "",
      scores: criteria.map((item) => ({ criterionId: item.id, score: 4 })),
    };
    expect(service.save("student", input)).rejects.toMatchObject({ statusCode: 403 });
    const saved = await service.save("supervisor", input);
    await service.submit("supervisor", saved.id);
    expect(service.save("supervisor", input)).rejects.toMatchObject({
      statusCode: 409,
      code: "EVALUATION_IMMUTABLE",
    });
  });
});

function memoryRepository(): RubricRepository {
  const submissions: any[] = [];
  return {
    async findPlacement() {
      return {
        id: "placement",
        studentUserId: "student",
        advisorUserId: "advisor",
        supervisorUserId: "supervisor",
        universityOrganizationId: "university",
        track: "regular",
        status: "active",
      };
    },
    async hasActiveUniversityStaffRole(_organizationId, userId) {
      return userId === "staff";
    },
    async findScheme() {
      return {
        id: "scheme",
        components: [
          {
            id: "component",
            evaluatorType: "supervisor",
            maxScore: 10,
            criteria,
          },
        ],
      };
    },
    async findSubmission(id) {
      return submissions.find((item) => item.id === id);
    },
    async findSubmissionByComponent(placementId, componentId) {
      return submissions.find(
        (item) => item.placementId === placementId && item.componentId === componentId,
      );
    },
    async createSubmission(input) {
      const record: any = {
        id: "submission",
        ...input,
        status: "draft",
        submittedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        component: {
          id: "component",
          evaluatorType: "supervisor",
          maxScore: 10,
          criteria,
        },
        scores: [],
      };
      submissions.push(record);
      return record;
    },
    async updateSubmission(id, changes) {
      const record = submissions.find((item) => item.id === id);
      Object.assign(record, changes);
      return record;
    },
    async replaceScores(id, scores) {
      const record = submissions.find((item) => item.id === id);
      record.scores = scores;
    },
    async listSubmissions() {
      return submissions;
    },
  };
}
