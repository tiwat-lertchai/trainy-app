export function canEditReport(status: string, isStudent: boolean) { return isStudent && (status === "draft" || status === "revision_requested"); }
export function canReviewReport(status: string, isReviewer: boolean) { return isReviewer && status === "submitted"; }
