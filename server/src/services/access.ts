import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export async function requireCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw new AppError(404, 'Category not found.');
  return category;
}

export function assertCategoryMatches(category: { id: string; type: string; archived: boolean }, type: string, currentCategoryId?: string): void {
  if (category.type !== type) throw new AppError(400, 'Choose a category that matches the transaction type.');
  if (category.archived && category.id !== currentCategoryId) {
    throw new AppError(400, 'That category is archived. Restore it or choose another.');
  }
}
