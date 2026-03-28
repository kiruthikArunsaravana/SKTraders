require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const baseDate = new Date('2026-01-01T09:00:00.000Z');
const daysInSeedRange = 90;

const productCatalog = [
  { id: 'coco-pith', name: 'Coco Pith', sku: 'COCO-PITH', price: 180, costPrice: 120, sellingPrice: 180, quantity: 180000 },
  { id: 'coir-fiber', name: 'Coir Fiber', sku: 'COIR-FIBER', price: 260, costPrice: 170, sellingPrice: 260, quantity: 150000 },
  { id: 'husk-chips', name: 'Husk Chips', sku: 'HUSK-CHIPS', price: 145, costPrice: 92, sellingPrice: 145, quantity: 125000 },
  { id: 'coconut', name: 'Coconut', sku: 'COCONUT', price: 16, costPrice: 11, sellingPrice: 16, quantity: 320000 },
  { id: 'copra', name: 'Copra', sku: 'COPRA', price: 310, costPrice: 225, sellingPrice: 310, quantity: 52000 },
  { id: 'coco-peat-block', name: 'Coco Peat Block', sku: 'COCO-BLOCK', price: 205, costPrice: 136, sellingPrice: 205, quantity: 74000 },
  { id: 'grow-bag', name: 'Grow Bag', sku: 'GROW-BAG', price: 245, costPrice: 168, sellingPrice: 245, quantity: 46000 },
  { id: 'coir-disc', name: 'Coir Disc', sku: 'COIR-DISC', price: 95, costPrice: 58, sellingPrice: 95, quantity: 68000 },
];

const localClientNames = [
  'Sri Murugan Traders',
  'Kavi Agro Store',
  'Velan Coconut Center',
  'Annai Husk Mart',
  'Thendral Farm Supplies',
  'Green Harvest Depot',
  'A1 Copra Market',
  'Nila Agro Agency',
  'Sakthi Coconut Yard',
  'Ponni Traders',
  'Maruthi Farm Gate',
  'Selvam Agro Inputs',
];

const internationalClientNames = [
  ['ABC Exports GmbH', 'Germany'],
  ['Dubai Fiber Trading', 'UAE'],
  ['Ocean Bloom BV', 'Netherlands'],
  ['Nordic Peat House', 'Sweden'],
  ['Desert Palm Global', 'Saudi Arabia'],
  ['Green Root LLC', 'United States'],
  ['Canary Garden SA', 'Spain'],
  ['Maple Hydroponics', 'Canada'],
];

const internationalPorts = {
  Germany: 'Hamburg',
  UAE: 'Jebel Ali',
  Netherlands: 'Rotterdam',
  Sweden: 'Gothenburg',
  'Saudi Arabia': 'Jeddah',
  'United States': 'Los Angeles',
  Spain: 'Valencia',
  Canada: 'Vancouver',
};

const statuses = ['To-do', 'In Progress', 'Completed'];
const paidStatuses = ['Pending', 'Paid'];

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addSeedRangeDays(days, hour = 9) {
  const result = new Date(baseDate);
  result.setUTCHours(hour, 0, 0, 0);
  result.setUTCDate(baseDate.getUTCDate() + ((days % daysInSeedRange) + daysInSeedRange) % daysInSeedRange);
  return result;
}

function shiftWithinSeedRange(date, days, hour = 9) {
  const seedRangeDay = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
  return addSeedRangeDays(seedRangeDay + days, hour);
}

function amount(value) {
  return Number(value.toFixed(2));
}

function makeId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

async function buildUsers() {
  const passwordHash = await bcrypt.hash('SecureP@ss123', 10);

  return [
    { email: 'manager@gmail.com', password: passwordHash, role: 'Manager' },
    { email: 'admin@sktraders.test', password: passwordHash, role: 'Admin' },
    { email: 'staff@sktraders.test', password: passwordHash, role: 'Employee' },
  ];
}

function buildClients() {
  const localClients = localClientNames.map((companyName, index) => ({
    id: `client-local-${String(index + 1).padStart(2, '0')}`,
    companyName,
    contactName: `Local Contact ${index + 1}`,
    contactEmail: `local${index + 1}@sktraders.test`,
    phone: `+91-90000-${String(11000 + index).padStart(5, '0')}`,
    country: 'India',
    clientType: 'local',
    createdAt: addSeedRangeDays(index),
  }));

  const internationalClients = internationalClientNames.map(([companyName, country], index) => ({
    id: `client-int-${String(index + 1).padStart(2, '0')}`,
    companyName,
    contactName: `Intl Contact ${index + 1}`,
    contactEmail: `intl${index + 1}@sktraders.test`,
    phone: `+44-200-${String(2200 + index).padStart(4, '0')}`,
    country,
    clientType: 'international',
    createdAt: addSeedRangeDays(index + 36),
  }));

  return [...localClients, ...internationalClients];
}

function buildProducts() {
  return productCatalog.map((product, index) => ({
    ...product,
    modifiedDate: addSeedRangeDays(72 + index),
    createdAt: addSeedRangeDays(index),
  }));
}

function buildCoconutPurchases(localClients) {
  return Array.from({ length: 40 }, (_, index) => {
    const client = localClients[index % localClients.length];
    const quantity = 6000 + ((index * 925) % 12000);
    const price = amount(11 + ((index % 7) * 0.85));
    const paymentStatus = paidStatuses[index % paidStatuses.length];
    const date = addSeedRangeDays(index * 2);

    return {
      id: makeId('purchase-coconut', index),
      clientId: client.id,
      supplier: client.companyName,
      quantity,
      price,
      paymentStatus,
      date,
      createdAt: date,
    };
  });
}

function buildWorkerEntries() {
  return Array.from({ length: 24 }, (_, index) => {
    const weekStart = addSeedRangeDays(index * 7);
    const processedCoconuts = 7000 + (index * 480);
    const totalWorkerCost = amount(processedCoconuts * 0.72);
    const paidToWorker = amount(totalWorkerCost * (index % 4 === 0 ? 0.55 : index % 2 === 0 ? 0.8 : 1));

    return {
      id: makeId('worker-entry', index),
      weekStart,
      processedCoconuts,
      totalWorkerCost,
      paidToWorker,
      createdAt: shiftWithinSeedRange(weekStart, 1),
    };
  });
}

function buildExports(internationalClients) {
  const exportProductIds = ['coco-pith', 'coir-fiber', 'husk-chips', 'copra', 'coco-peat-block', 'grow-bag', 'coir-disc'];

  return Array.from({ length: 48 }, (_, index) => {
    const client = internationalClients[index % internationalClients.length];
    const productId = exportProductIds[index % exportProductIds.length];
    const product = productCatalog.find((item) => item.id === productId);
    const quantity = 180 + ((index * 35) % 520);
    const price = amount((product ? product.sellingPrice : 100) + ((index % 5) * 12));
    const status = statuses[index % statuses.length];
    const paymentStatus = index % 3 === 0 || status === 'Completed' ? 'Paid' : 'Pending';
    const date = addSeedRangeDays(10 + index * 2);

    return {
      id: makeId('export', index),
      clientId: client.id,
      productId,
      destinationCountry: client.country,
      destinationPort: internationalPorts[client.country] || 'Main Port',
      quantity,
      price,
      status,
      paymentStatus,
      invoiceNumber: `EXP-${String(3001 + index).padStart(4, '0')}`,
      date,
      createdAt: date,
    };
  });
}

function buildLocalSales(localClients) {
  const localProductIds = ['husk-chips', 'copra', 'coconut', 'coir-fiber', 'coco-pith', 'coco-peat-block'];

  return Array.from({ length: 60 }, (_, index) => {
    const client = localClients[index % localClients.length];
    const productId = localProductIds[index % localProductIds.length];
    const product = productCatalog.find((item) => item.id === productId);
    const quantity = 90 + ((index * 17) % 260);
    const price = amount((product ? product.sellingPrice : 0) + ((index % 4) * 6));
    const status = statuses[(index + 1) % statuses.length];
    const paymentStatus = index % 4 === 0 || status === 'Completed' ? 'Paid' : 'Pending';
    const date = addSeedRangeDays(6 + index);

    return {
      id: makeId('local-sale', index),
      clientId: index % 9 === 0 ? null : client.id,
      productId,
      quantity,
      price,
      status,
      paymentStatus,
      invoiceNumber: `LOC-${String(5001 + index).padStart(4, '0')}`,
      date,
      createdAt: date,
    };
  });
}

function buildFinancialTransactions({ coconutPurchases, coconutWorkerEntries, exportsData, localSales }) {
  const transactions = [];
  const localClientById = new Map(
    localClientNames.map((companyName, index) => [`client-local-${String(index + 1).padStart(2, '0')}`, companyName])
  );
  const internationalClientById = new Map(
    internationalClientNames.map(([companyName], index) => [`client-int-${String(index + 1).padStart(2, '0')}`, companyName])
  );

  coconutPurchases.forEach((purchase, index) => {
    if (purchase.paymentStatus !== 'Paid') return;

    transactions.push({
      id: `ftx-purchase-${String(index + 1).padStart(3, '0')}`,
      amount: amount(-(purchase.quantity * purchase.price)),
      type: 'expense',
      date: shiftWithinSeedRange(purchase.date, 1),
      description: `Paid for purchase of ${purchase.quantity} coconuts from ${purchase.supplier}`,
      category: 'Coconut',
      clientName: purchase.supplier,
      quantity: purchase.quantity,
      createdAt: shiftWithinSeedRange(purchase.date, 1),
    });
  });

  coconutWorkerEntries.forEach((entry, index) => {
    if (entry.paidToWorker <= 0) return;

    transactions.push({
      id: `ftx-worker-${String(index + 1).padStart(3, '0')}`,
      amount: amount(-entry.paidToWorker),
      type: 'expense',
      date: shiftWithinSeedRange(entry.weekStart, 2),
      description: `Worker payment for coconut processing week of ${entry.weekStart.toISOString().slice(0, 10)}`,
      category: 'Labour',
      clientName: 'Coconut Worker',
      quantity: entry.processedCoconuts,
      createdAt: shiftWithinSeedRange(entry.weekStart, 2),
    });
  });

  exportsData.forEach((record, index) => {
    if (record.paymentStatus !== 'Paid') return;
    const clientName = internationalClientById.get(record.clientId);
    const product = productCatalog.find((item) => item.id === record.productId);

    transactions.push({
      id: `ftx-export-${String(index + 1).padStart(3, '0')}`,
      amount: amount(record.quantity * record.price),
      type: 'income',
      date: shiftWithinSeedRange(record.date, 2),
      description: `Export order of ${record.quantity} ${product ? product.name : record.productId} for ${clientName || 'International Client'}`,
      category: product ? product.name : record.productId,
      clientName: clientName || 'International Client',
      quantity: record.quantity,
      createdAt: shiftWithinSeedRange(record.date, 2),
    });
  });

  localSales.forEach((record, index) => {
    if (record.paymentStatus !== 'Paid') return;
    const product = productCatalog.find((item) => item.id === record.productId);
    const clientName = record.clientId
      ? localClientById.get(record.clientId) || 'Local Client'
      : 'Walk-in';

    transactions.push({
      id: `ftx-local-${String(index + 1).padStart(3, '0')}`,
      amount: amount(record.quantity * record.price),
      type: 'income',
      date: shiftWithinSeedRange(record.date, 1),
      description: `Local sale of ${record.quantity} ${product ? product.name : record.productId} to ${clientName}`,
      category: product ? product.name : record.productId,
      clientName,
      quantity: record.quantity,
      createdAt: shiftWithinSeedRange(record.date, 1),
    });
  });

  const miscEntries = [
    ['Warehouse rent for Q1', 'Rent', 'expense', -145000, 'Main Warehouse'],
    ['Container loading and port handling', 'Logistics', 'expense', -86500, 'Harbour Services'],
    ['Machine maintenance and belt replacement', 'Maintenance', 'expense', -52250, 'Plant Maintenance'],
    ['Sale of reusable coir scraps', 'Other Income', 'income', 33750, 'Scrap Buyer'],
    ['Solar subsidy credit received', 'Other Income', 'income', 18500, 'State Board'],
    ['Generator diesel refill', 'Fuel', 'expense', -26400, 'Fuel Station'],
  ];

  miscEntries.forEach(([description, category, type, value, clientName], index) => {
    const date = addSeedRangeDays(18 + (index * 14));
    transactions.push({
      id: `ftx-misc-${String(index + 1).padStart(3, '0')}`,
      amount: amount(value),
      type,
      date,
      description,
      category,
      clientName,
      quantity: null,
      createdAt: date,
    });
  });

  return transactions.sort((a, b) => a.date - b.date);
}

async function main() {
  const users = await buildUsers();
  const clients = buildClients();
  const products = buildProducts();
  const localClients = clients.filter((client) => client.clientType === 'local');
  const internationalClients = clients.filter((client) => client.clientType === 'international');
  const coconutPurchases = buildCoconutPurchases(localClients);
  const coconutWorkerEntries = buildWorkerEntries();
  const exportsData = buildExports(internationalClients);
  const localSales = buildLocalSales(localClients);
  const financialTransactions = buildFinancialTransactions({
    coconutPurchases,
    coconutWorkerEntries,
    exportsData,
    localSales,
  });

  await prisma.$transaction(async (tx) => {
    await tx.coconutWorkerEntry.deleteMany();
    await tx.financialTransaction.deleteMany();
    await tx.export.deleteMany();
    await tx.localSale.deleteMany();
    await tx.coconutPurchase.deleteMany();
    await tx.client.deleteMany();
    await tx.product.deleteMany();
    await tx.user.deleteMany();

    await tx.user.createMany({ data: users });
    await tx.client.createMany({ data: clients });
    await tx.product.createMany({ data: products });
    await tx.coconutPurchase.createMany({ data: coconutPurchases });
    await tx.coconutWorkerEntry.createMany({ data: coconutWorkerEntries });
    await tx.export.createMany({ data: exportsData });
    await tx.localSale.createMany({ data: localSales });
    await tx.financialTransaction.createMany({ data: financialTransactions });
  });

  console.log('Large dummy data seeded successfully.');
  console.log('Users:', users.length);
  console.log('Clients:', clients.length);
  console.log('Products:', products.length);
  console.log('Coconut purchases:', coconutPurchases.length);
  console.log('Coconut worker entries:', coconutWorkerEntries.length);
  console.log('Exports:', exportsData.length);
  console.log('Local sales:', localSales.length);
  console.log('Financial transactions:', financialTransactions.length);
  console.log('Default login: manager@gmail.com / SecureP@ss123');
}

main()
  .catch((error) => {
    console.error('Failed to seed dummy data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
