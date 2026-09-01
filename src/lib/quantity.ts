import type { Prisma, Product } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function createMovementIfNeeded(tx: Tx, existing: Product, newQuantity: number) {
  const quantityChanged = newQuantity !== existing.currentQuantity;
  if (!quantityChanged || !existing.trackingActive) return;

  const diff = existing.currentQuantity - newQuantity;
  await tx.quantityMovement.create({
    data: {
      productId: existing.id,
      previousQuantity: existing.currentQuantity,
      newQuantity,
      quantityDiff: diff,
      estimatedRevenue: diff > 0 ? diff * existing.sellingPrice : 0,
      estimatedProfit: diff > 0 ? diff * (existing.sellingPrice - existing.costPrice) : 0,
    },
  });
}
