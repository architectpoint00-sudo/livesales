import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const productId = searchParams.get('productId') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  const where: Record<string, unknown> = {};
  if (productId) where.productId = productId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }
  if (search) {
    where.product = { name: { contains: search, mode: 'insensitive' } };
  }

  const [movements, total] = await Promise.all([
    prisma.quantityMovement.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: { product: { select: { name: true, image: true, sku: true, category: true } } },
    }),
    prisma.quantityMovement.count({ where }),
  ]);

  return NextResponse.json({ movements, total, page, limit });
}
