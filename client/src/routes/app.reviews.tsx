import { createFileRoute } from "@tanstack/react-router";
import { OnboardingReviewPage } from "@/features/onboarding/onboarding-review-page";

export const Route = createFileRoute("/app/reviews")({ component: OnboardingReviewPage });
