import { prisma } from '@/lib/prisma';
import { createMovementIfNeeded } from '@/lib/quantity';
import { checkCompetitorSource, type SourcePlatform } from '@/lib/competitor-check';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { sourceUrl: { not: null }, trackingActive: true },
  });

  let updated = 0;
  const errors: { id: string; message: string }[] = [];

  for (const product of products) {
    try {
      const result = await checkCompetitorSource(product.sourceUrl!, product.sourcePlatform as SourcePlatform | undefined);
      await prisma.$transaction(async (tx) => {
        if (result.quantity != null) {
          await createMovementIfNeeded(tx, product, result.quantity);
          if (result.quantity !== product.currentQuantity) updated++;
        }
        await tx.product.update({
          where: { id: product.id },
          data: {
            sourcePlatform: result.platform,
            lastCheckedAt: new Date(),
            ...(result.inStock != null ? { lastKnownInStock: result.inStock } : {}),
            ...(result.quantity != null ? { currentQuantity: result.quantity } : {}),
          },
        });
      });
    } catch (error: unknown) {
      errors.push({ id: product.id, message: error instanceof Error ? error.message : 'Check failed' });
    }
    // Stagger requests so we don't hammer a target site (or our own low-memory host) in a tight loop.
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ checked: products.length, updated, errors });
}
