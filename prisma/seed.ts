import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { name: 'iPhone 17 Pro', category: 'Smartphone', brand: 'Apple', sku: 'APL-IP17P-256', sellingPrice: 999, costPrice: 650, startingQuantity: 100, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch_GEO_US?wid=400' },
  { name: 'MacBook Pro 16"', category: 'Laptop', brand: 'Apple', sku: 'APL-MBP16-M4', sellingPrice: 1999, costPrice: 1400, startingQuantity: 50, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp16-spacegray-select-202310?wid=400' },
  { name: 'Sony WH-1000XM5', category: 'Audio', brand: 'Sony', sku: 'SNY-WH1000XM5', sellingPrice: 299, costPrice: 180, startingQuantity: 80, image: null },
  { name: 'Samsung Galaxy S25 Ultra', category: 'Smartphone', brand: 'Samsung', sku: 'SAM-S25U-256', sellingPrice: 1199, costPrice: 780, startingQuantity: 75, image: null },
  { name: 'iPad Pro 13"', category: 'Laptop', brand: 'Apple', sku: 'APL-IPADP13', sellingPrice: 1299, costPrice: 900, startingQuantity: 60, image: null },
  { name: 'AirPods Pro 3', category: 'Audio', brand: 'Apple', sku: 'APL-APP3', sellingPrice: 249, costPrice: 140, startingQuantity: 120, image: null },
  { name: 'Nintendo Switch 2', category: 'Gaming', brand: 'Nintendo', sku: 'NTD-SW2', sellingPrice: 449, costPrice: 300, startingQuantity: 40, image: null },
  { name: 'PS5 Slim', category: 'Gaming', brand: 'Sony', sku: 'SNY-PS5S', sellingPrice: 449, costPrice: 350, startingQuantity: 35, image: null },
  { name: 'Canon EOS R6 III', category: 'Camera', brand: 'Canon', sku: 'CAN-R6III', sellingPrice: 2499, costPrice: 1800, startingQuantity: 20, image: null },
  { name: 'Apple Watch Ultra 3', category: 'Wearable', brand: 'Apple', sku: 'APL-AWU3', sellingPrice: 799, costPrice: 480, startingQuantity: 45, image: null },
  { name: 'Samsung Galaxy Watch 7', category: 'Wearable', brand: 'Samsung', sku: 'SAM-GW7', sellingPrice: 329, costPrice: 190, startingQuantity: 55, image: null },
  { name: 'Bose QuietComfort Ultra', category: 'Audio', brand: 'Bose', sku: 'BSE-QCU', sellingPrice: 379, costPrice: 220, startingQuantity: 65, image: null },
];

async function main() {
  console.log('Seeding database...');

  await prisma.quantityMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.settings.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });

  const now = new Date();

  for (const p of products) {
    const trackingStart = new Date(now);
    trackingStart.setDate(trackingStart.getDate() - Math.floor(Math.random() * 14 + 7));

    const totalSold = Math.floor(Math.random() * (p.startingQuantity * 0.5)) + 5;
    const currentQuantity = p.startingQuantity - totalSold;

    const product = await prisma.product.create({
      data: {
        ...p,
        currentQuantity,
        lowStockLimit: Math.floor(p.startingQuantity * 0.15),
        trackingActive: true,
        trackingStartDate: trackingStart,
      },
    });

    const movementCount = Math.floor(Math.random() * 8) + 3;
    let remainingToSell = totalSold;
    const movementDate = new Date(trackingStart);

    for (let i = 0; i < movementCount && remainingToSell > 0; i++) {
      movementDate.setHours(movementDate.getHours() + Math.floor(Math.random() * 24) + 2);
      if (movementDate > now) break;

      const qty = i === movementCount - 1
        ? remainingToSell
        : Math.min(Math.floor(Math.random() * Math.ceil(remainingToSell / 2)) + 1, remainingToSell);

      const prevQty = p.startingQuantity - (totalSold - remainingToSell);
      remainingToSell -= qty;

      await prisma.quantityMovement.create({
        data: {
          productId: product.id,
          previousQuantity: prevQty,
          newQuantity: prevQty - qty,
          quantityDiff: qty,
          estimatedRevenue: qty * p.sellingPrice,
          estimatedProfit: qty * (p.sellingPrice - p.costPrice),
          createdAt: new Date(movementDate),
        },
      });
    }

    console.log(`  Created ${product.name}: ${currentQuantity}/${p.startingQuantity} (${totalSold} sold, ${movementCount} movements)`);
  }

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
