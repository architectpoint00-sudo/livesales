import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (status) where.status = status;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, image, description, category, brand, sku,
      sellingPrice, costPrice, startingQuantity,
      lowStockLimit, trackingActive, sourceUrl, sourcePlatform,
    } = body;

    if (!name || sellingPrice == null || costPrice == null || startingQuantity == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        image: image || null,
        description: description || null,
        category: category || null,
        brand: brand || null,
        sku: sku || null,
        sellingPrice: parseFloat(sellingPrice),
        costPrice: parseFloat(costPrice),
        startingQuantity: parseInt(startingQuantity),
        currentQuantity: parseInt(startingQuantity),
        lowStockLimit: lowStockLimit ? parseInt(lowStockLimit) : 10,
        trackingActive: trackingActive || false,
        trackingStartDate: trackingActive ? new Date() : null,
        sourceUrl: sourceUrl || null,
        sourcePlatform: sourcePlatform || null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
