describe('ExamTasksService', () => {
	it.todo('remove() throws ConflictException listing variant titles when task is in a published variant (TASK-04)');
	it.todo('remove() returns { needsConfirm: true, variantNames: [...] } when only draft variants reference the task and confirm is falsy (TASK-04)');
	it.todo('remove() executes prisma.$transaction([deleteMany variantTask, delete examTask]) when confirm=true and only draft variants exist (TASK-04)');
	it.todo('list() builds Prisma where clause with section, format, and source contains+insensitive filters (TASK-06)');
});
