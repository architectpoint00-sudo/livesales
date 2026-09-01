import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [products, movements, recentMovements] = await Promise.all([
    prisma.product.findMany({ where: { trackingActive: true } }),
    prisma.quantityMovement.aggregate({
      _sum: { quantityDiff: true, estimatedRevenue: true, estimatedProfit: true },
    }),
    prisma.quantityMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { product: { select: { name: true, image: true, sellingPrice: true } } },
    }),
  ]);

  const totalTracking = products.length;
  const totalSold = movements._sum.quantityDiff || 0;
  const totalRevenue = movements._sum.estimatedRevenue || 0;
  const totalProfit = movements._sum.estimatedProfit || 0;
  const remainingInventory = products.reduce((s, p) => s + p.currentQuantity, 0);
  const lowStockProducts = products.filter((p) => p.currentQuantity <= p.lowStockLimit);

  const productSales = await prisma.quantityMovement.groupBy({
    by: ['productId'],
    _sum: { quantityDiff: true, estimatedRevenue: true },
    orderBy: { _sum: { quantityDiff: 'desc' } },
    take: 5,
  });

  const topProductIds = productSales.map((ps) => ps.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, image: true },
  });

  const bestSellers = productSales.map((ps) => {
    const prod = topProducts.find((p) => p.id === ps.productId);
    return {
      id: ps.productId,
      name: prod?.name || 'Unknown',
      image: prod?.image,
      unitsSold: ps._sum.quantityDiff || 0,
      revenue: ps._sum.estimatedRevenue || 0,
    };
  });

  return NextResponse.json({
    totalTracking,
    totalSold,
    remainingInventory,
    totalRevenue,
    totalProfit,
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      current: p.currentQuantity,
      limit: p.lowStockLimit,
    })),
    bestSellers,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      productName: m.product.name,
      productImage: m.product.image,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      quantityDiff: m.quantityDiff,
      estimatedRevenue: m.estimatedRevenue,
      createdAt: m.createdAt,
    })),
  });
}
