import { apiClient } from "@/lib/api-client";

export async function loadStudentProfile() {
	const response = await apiClient.api.v1["student-profile"].me.$get();
	if (!response.ok) throw new Error("STUDENT_PROFILE_FAILED");
	return response.json();
}
