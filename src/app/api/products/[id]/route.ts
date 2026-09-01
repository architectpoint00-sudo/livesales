import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newQuantity = body.currentQuantity != null ? parseInt(body.currentQuantity) : undefined;
    const quantityChanged = newQuantity != null && newQuantity !== existing.currentQuantity;

    const updates: Record<string, unknown> = {};
    const fields = [
      'name', 'image', 'description', 'category', 'brand', 'sku',
      'sellingPrice', 'costPrice', 'lowStockLimit', 'status',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates[f] = ['sellingPrice', 'costPrice'].includes(f)
          ? parseFloat(body[f])
          : f === 'lowStockLimit'
            ? parseInt(body[f])
            : body[f];
      }
    }

    if (body.trackingActive !== undefined) {
      updates.trackingActive = body.trackingActive;
      if (body.trackingActive && !existing.trackingActive) {
        updates.trackingStartDate = new Date();
      }
    }

    if (newQuantity != null) {
      updates.currentQuantity = newQuantity;
    }

    const product = await prisma.$transaction(async (tx) => {
      if (quantityChanged && existing.trackingActive) {
        const diff = existing.currentQuantity - newQuantity!;
        await tx.quantityMovement.create({
          data: {
            productId: id,
            previousQuantity: existing.currentQuantity,
            newQuantity: newQuantity!,
            quantityDiff: diff,
            estimatedRevenue: diff > 0 ? diff * existing.sellingPrice : 0,
            estimatedProfit: diff > 0 ? diff * (existing.sellingPrice - existing.costPrice) : 0,
          },
        });
      }
      return tx.product.update({ where: { id }, data: updates });
    });

    return NextResponse.json(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
