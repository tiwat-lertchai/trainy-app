import { createFileRoute } from "@tanstack/react-router";
import { PlacementPage } from "@/features/placements/placement-page";

export const Route = createFileRoute("/app/placements")({ component: PlacementPage });
