import { describe, expect, test } from "bun:test";
import { universities } from "./seed-academic-data";

describe("academic seed data", () => {
  test("contains the complete Chandrakasem faculty program catalog", () => {
    const university = universities.find(({ slug }) => slug === "chandrakasem-rajabhat-university");

    expect(university?.name).toBe("มหาวิทยาลัยราชภัฏจันทรเกษม");
    expect(university?.faculties).toHaveLength(5);
    expect(university?.faculties.flatMap(({ majors }) => majors)).toHaveLength(47);
  });

  test("has no duplicate faculty or major names within a faculty", () => {
    for (const university of universities) {
      const facultyNames = university.faculties.map(({ name }) => name);
      expect(new Set(facultyNames).size).toBe(facultyNames.length);

      for (const faculty of university.faculties) {
        expect(new Set(faculty.majors).size).toBe(faculty.majors.length);
      }
    }
  });
});
