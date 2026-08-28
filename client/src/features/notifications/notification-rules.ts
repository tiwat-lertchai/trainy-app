export function countUnread(items: Array<{ readAt: string | null }>) {
	return items.filter((item) => item.readAt === null).length;
}
