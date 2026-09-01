import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const range = searchParams.get('range') || '30';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let startDate: Date;
  const endDate = to ? new Date(to) : new Date();

  if (from) {
    startDate = new Date(from);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(range));
  }

  const movements = await prisma.quantityMovement.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: { product: { select: { name: true, category: true, sellingPrice: true, costPrice: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap = new Map<string, { revenue: number; profit: number; units: number }>();
  movements.forEach((m) => {
    const day = m.createdAt.toISOString().split('T')[0];
    const existing = dailyMap.get(day) || { revenue: 0, profit: 0, units: 0 };
    existing.revenue += m.estimatedRevenue;
    existing.profit += m.estimatedProfit;
    existing.units += m.quantityDiff > 0 ? m.quantityDiff : 0;
    dailyMap.set(day, existing);
  });

  const dailyRevenue = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const categoryMap = new Map<string, { units: number; revenue: number }>();
  movements.forEach((m) => {
    const cat = m.product.category || 'Uncategorized';
    const existing = categoryMap.get(cat) || { units: 0, revenue: 0 };
    existing.units += m.quantityDiff > 0 ? m.quantityDiff : 0;
    existing.revenue += m.estimatedRevenue;
    categoryMap.set(cat, existing);
  });

  const categoryPerformance = Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const productMap = new Map<string, { name: string; units: number; revenue: number; profit: number }>();
  movements.forEach((m) => {
    const existing = productMap.get(m.productId) || { name: m.product.name, units: 0, revenue: 0, profit: 0 };
    existing.units += m.quantityDiff > 0 ? m.quantityDiff : 0;
    existing.revenue += m.estimatedRevenue;
    existing.profit += m.estimatedProfit;
    productMap.set(m.productId, existing);
  });

  const productPerformance = Array.from(productMap.values()).sort((a, b) => b.units - a.units);

  const products = await prisma.product.findMany({
    where: { trackingActive: true },
    select: { name: true, category: true, currentQuantity: true, sellingPrice: true, costPrice: true },
  });

  const inventoryValue = products.reduce((s, p) => s + p.currentQuantity * p.costPrice, 0);
  const retailValue = products.reduce((s, p) => s + p.currentQuantity * p.sellingPrice, 0);

  return NextResponse.json({
    dailyRevenue,
    categoryPerformance,
    productPerformance,
    inventoryValue,
    retailValue,
    totalMovements: movements.length,
  });
}
