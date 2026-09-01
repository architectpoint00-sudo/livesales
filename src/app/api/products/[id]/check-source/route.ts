import { prisma } from '@/lib/prisma';
import { createMovementIfNeeded } from '@/lib/quantity';
import { checkCompetitorSource, type SourcePlatform } from '@/lib/competitor-check';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!existing.sourceUrl) return NextResponse.json({ error: 'No source URL set for this product' }, { status: 400 });

  try {
    const result = await checkCompetitorSource(existing.sourceUrl, existing.sourcePlatform as SourcePlatform | undefined);

    const product = await prisma.$transaction(async (tx) => {
      if (result.quantity != null) {
        await createMovementIfNeeded(tx, existing, result.quantity);
      }
      return tx.product.update({
        where: { id },
        data: {
          sourcePlatform: result.platform,
          lastCheckedAt: new Date(),
          ...(result.inStock != null ? { lastKnownInStock: result.inStock } : {}),
          ...(result.quantity != null ? { currentQuantity: result.quantity } : {}),
        },
      });
    });

    return NextResponse.json({ ...result, product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
