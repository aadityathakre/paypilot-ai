import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PayPilot AI database seed...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning old records...');
  await prisma.auditEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.agentEvent.deleteMany();
  await prisma.agentMessage.deleteMany();
  await prisma.agentSession.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchantPolicy.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Merchant Owner User
  const merchantPasswordHash = await bcrypt.hash('MerchantPass@123', 10);
  const merchantUser = await prisma.user.create({
    data: {
      name: 'Aditya Merchant',
      email: 'merchant@paypilot.ai',
      passwordHash: merchantPasswordHash,
      role: UserRole.MERCHANT,
    },
  });
  console.log(`✅ Created Merchant User: ${merchantUser.email}`);

  // 3. Create Demo Customer User
  const customerPasswordHash = await bcrypt.hash('CustomerPass@123', 10);
  const customerUser = await prisma.user.create({
    data: {
      name: 'Rohan Sharma',
      email: 'customer@paypilot.ai',
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
    },
  });
  console.log(`✅ Created Customer User: ${customerUser.email}`);

  // 4. Create Merchant Entity
  const merchant = await prisma.merchant.create({
    data: {
      ownerUserId: merchantUser.id,
      name: 'PayPilot Tech Emporium',
      currency: 'INR',
    },
  });
  console.log(`✅ Created Merchant Organization: ${merchant.name}`);

  // 5. Create Merchant Policy (Deterministic Guardrails)
  const policy = await prisma.merchantPolicy.create({
    data: {
      merchantId: merchant.id,
      maxOrderValuePaise: BigInt(8000000), // ₹80,000 max order cap
      maxUpsellDiscountBps: 1000,          // 10% max bundle discount
      upsellEnabled: true,
      paymentConfirmationRequired: true,
      allowedCategories: ['laptops', 'monitors', 'keyboards_mice', 'audio_video', 'gadgets', 'apparel', 'electricals', 'accessories'],
      allowedAgentActions: ['SEARCH_CATALOG', 'RECOMMEND_PRODUCT', 'PROPOSE_UPSELL', 'CREATE_ORDER'],
    },
  });
  console.log(`✅ Created Merchant Policy: Max Order ₹${Number(policy.maxOrderValuePaise) / 100}`);

  // 6. Seed Realistic Synthetic Products Catalog across Electronics, Gadgets, Clothes & Accessories
  const productsData = [
    // Laptops
    {
      sku: 'LAP-DEV-001',
      name: 'Pro Developer Laptop 15',
      category: 'laptops',
      description: 'Intel Core i7 13th Gen, 16GB LPDDR5 RAM, 512GB NVMe SSD, 15.6" Anti-Glare FHD, 14hr battery life. Optimized for software development & multitasking.',
      pricePaise: BigInt(6499000), // ₹64,990
      stock: 25,
      merchantScore: 0.95,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60',
      attributes: { ram: '16GB', storage: '512GB SSD', processor: 'Intel i7-13700H', battery: '14 hours', useCase: ['coding', 'productivity', 'office'] },
    },
    {
      sku: 'LAP-GAM-002',
      name: 'Ultra Gaming Rig 16',
      category: 'laptops',
      description: 'AMD Ryzen 7 7840HS, NVIDIA RTX 4060 (8GB VRAM), 16GB DDR5 RAM, 1TB Gen4 SSD, 16" 165Hz QHD Display. Built for high-FPS gaming & rendering.',
      pricePaise: BigInt(7999000), // ₹79,990
      stock: 14,
      merchantScore: 0.92,
      imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=60',
      attributes: { ram: '16GB', storage: '1TB SSD', gpu: 'NVIDIA RTX 4060', refreshRate: '165Hz', useCase: ['gaming', '3d-rendering', 'editing'] },
    },
    {
      sku: 'LAP-STU-003',
      name: 'Student Ultrabook Air 14',
      category: 'laptops',
      description: 'Intel Core i5 12th Gen, 8GB RAM, 512GB SSD, Ultra-lightweight 1.2kg metal body, Backlit Keyboard, All-day 11hr battery. Ideal for college and study.',
      pricePaise: BigInt(4299000), // ₹42,990
      stock: 35,
      merchantScore: 0.88,
      imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=60',
      attributes: { ram: '8GB', storage: '512GB SSD', weight: '1.2kg', battery: '11 hours', useCase: ['student', 'browsing', 'study'] },
    },
    {
      sku: 'LAP-MAX-004',
      name: 'Creator Studio Max 16 (OLED)',
      category: 'laptops',
      description: 'Intel Core i9 13th Gen, 32GB RAM, 1TB NVMe SSD, 16" 4K OLED HDR Touchscreen, RTX 4070. Professional workstation for digital creators.',
      pricePaise: BigInt(9499000), // ₹94,990 (exceeds ceiling)
      stock: 8,
      merchantScore: 0.97,
      imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=60',
      attributes: { ram: '32GB', storage: '1TB SSD', display: '4K OLED', useCase: ['creative', 'production', 'enterprise'] },
    },

    // Monitors
    {
      sku: 'MON-4K-001',
      name: '27" 4K UHD UltraSharp Coding Monitor',
      category: 'monitors',
      description: '27-inch IPS 4K (3840x2160), 99% sRGB color accuracy, USB-C 90W Power Delivery, Height-Adjustable Stand, TUV Eye Care Certification.',
      pricePaise: BigInt(2499000), // ₹24,990
      stock: 20,
      merchantScore: 0.91,
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=60',
      attributes: { resolution: '4K UHD', size: '27 inch', typeC_PD: '90W', panel: 'IPS', useCase: ['coding', 'office', 'design'] },
    },
    {
      sku: 'MON-GAM-002',
      name: '24" 165Hz Esports Gaming Monitor',
      category: 'monitors',
      description: '24-inch Fast IPS FHD Display, 165Hz Refresh Rate, 1ms MPRT response time, AMD FreeSync Premium, HDR10 Ready.',
      pricePaise: BigInt(1449000), // ₹14,490
      stock: 30,
      merchantScore: 0.89,
      imageUrl: 'https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=800&auto=format&fit=crop&q=60',
      attributes: { resolution: '1080p FHD', size: '24 inch', refreshRate: '165Hz', responseTime: '1ms', useCase: ['gaming', 'esports'] },
    },

    // Keyboards & Mice
    {
      sku: 'ACC-MOU-001',
      name: 'Ergonomic Vertical Wireless Mouse',
      category: 'keyboards_mice',
      description: 'Ergonomic 57-degree natural vertical grip, silent click buttons, multi-device Bluetooth & 2.4GHz USB receiver, 18-month battery life.',
      pricePaise: BigInt(149900), // ₹1,499
      stock: 60,
      merchantScore: 0.94,
      imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=60',
      attributes: { type: 'Ergonomic Vertical', connectivity: 'Bluetooth + 2.4G', dpi: '4000 DPI', useCase: ['ergonomics', 'office', 'productivity'] },
    },
    {
      sku: 'ACC-KEY-002',
      name: 'Wireless Mechanical Keyboard (Brown Switches)',
      category: 'keyboards_mice',
      description: '75% compact layout, hot-swappable tactile brown switches, multi-color RGB backlighting, durable PBT keycaps, triple mode connection.',
      pricePaise: BigInt(449000), // ₹4,490
      stock: 40,
      merchantScore: 0.93,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=60',
      attributes: { layout: '75%', switchType: 'Tactile Brown', keycaps: 'PBT', useCase: ['coding', 'typing', 'gaming'] },
    },
    {
      sku: 'ACC-MOU-003',
      name: 'Precision Ergonomic Wireless Mouse',
      category: 'keyboards_mice',
      description: 'Precision optical tracking, dual Bluetooth + 2.4G, silent click buttons, rechargeable Li-ion battery.',
      pricePaise: BigInt(199000), // ₹1,990
      stock: 55,
      merchantScore: 0.92,
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=60',
      attributes: { type: 'Wireless Mouse', connectivity: 'Dual Mode', battery: 'Rechargeable', useCase: ['office', 'coding'] },
    },

    // Audio & Video
    {
      sku: 'AUD-ANC-001',
      name: 'Active Noise-Cancelling Wireless Headphones',
      category: 'audio_video',
      description: 'Hybrid Active Noise Cancellation (up to 40dB reduction), 40mm Titanium Drivers, 45-hour battery life, comfortable memory foam earcups.',
      pricePaise: BigInt(899000), // ₹8,990
      stock: 25,
      merchantScore: 0.92,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
      attributes: { anc: 'Hybrid ANC', battery: '45 hours', drivers: '40mm Titanium', useCase: ['focus', 'travel', 'calls'] },
    },
    {
      sku: 'CAM-FHD-002',
      name: '1080p 60FPS Ultra HD Streaming Webcam',
      category: 'audio_video',
      description: 'Full HD 1080p 60FPS glass lens with fast autofocus, built-in dual stereo noise-reduction microphones, privacy shutter, USB plug & play.',
      pricePaise: BigInt(349000), // ₹3,490
      stock: 35,
      merchantScore: 0.89,
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=60',
      attributes: { resolution: '1080p 60FPS', mic: 'Dual Stereo', fieldOfView: '90 degrees', useCase: ['wfh-calls', 'streaming', 'teaching'] },
    },

    // Electronics & Gadgets
    {
      sku: 'GAD-WAT-001',
      name: 'Pro Fitness AMOLED Smartwatch 2.0',
      category: 'gadgets',
      description: '1.43" HD AMOLED Display, Continuous Heart Rate & SpO2 Monitor, Built-in GPS, 100+ Sports Modes, IP68 Waterproof, 12-day battery.',
      pricePaise: BigInt(499000), // ₹4,990
      stock: 45,
      merchantScore: 0.94,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60',
      attributes: { display: 'AMOLED', battery: '12 days', sensors: 'GPS + SpO2', rating: 'IP68', useCase: ['fitness', 'gadget', 'lifestyle'] },
    },
    {
      sku: 'GAD-TWS-002',
      name: 'True Wireless Active ANC Earbuds',
      category: 'gadgets',
      description: 'Custom 10mm Graphene Drivers, Active Noise Cancellation, Low-Latency Game Mode, IPX5 Sweatproof, 32-hour total playback with USB-C case.',
      pricePaise: BigInt(399000), // ₹3,990
      stock: 50,
      merchantScore: 0.93,
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=60',
      attributes: { anc: '30dB ANC', battery: '32 hours', latency: '40ms', useCase: ['music', 'calls', 'gaming'] },
    },
    {
      sku: 'GAD-TAB-003',
      name: '11" Ultra Retina Tablet 128GB',
      category: 'gadgets',
      description: '11-inch 2.5K Retina Display (90Hz), Octa-Core Processor, 6GB RAM, 128GB Storage, Quad Speakers with Dolby Atmos, Stylus support.',
      pricePaise: BigInt(2899000), // ₹28,990
      stock: 18,
      merchantScore: 0.95,
      imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=60',
      attributes: { screen: '11 inch 2.5K', storage: '128GB', ram: '6GB', audio: 'Quad Speakers', useCase: ['media', 'reading', 'drawing'] },
    },
    {
      sku: 'GAD-POW-004',
      name: '20000mAh 45W Fast Charging Powerbank',
      category: 'gadgets',
      description: 'High-density 20000mAh Lithium-Polymer battery, 45W Power Delivery for laptops & phones, LED percentage display, Pass-through charging.',
      pricePaise: BigInt(249000), // ₹2,490
      stock: 80,
      merchantScore: 0.91,
      imageUrl: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=800&auto=format&fit=crop&q=60',
      attributes: { capacity: '20000mAh', power: '45W PD', ports: '3 Ports', useCase: ['travel', 'emergency', 'power'] },
    },

    // Clothes, Apparel & Developer Gear
    {
      sku: 'APP-HOD-001',
      name: 'Developer Heavyweight Organic Hoodie (Black)',
      category: 'apparel',
      description: 'Premium 400 GSM 100% Organic Combed Cotton fleece hoodie. Relaxed fit, double-lined hood, hidden internal phone pocket. Built for long coding nights.',
      pricePaise: BigInt(199000), // ₹1,990
      stock: 50,
      merchantScore: 0.95,
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=60',
      attributes: { material: '100% Cotton', weight: '400 GSM', fit: 'Relaxed', color: 'Midnight Black', useCase: ['clothing', 'wfh', 'casual'] },
    },
    {
      sku: 'APP-BAG-002',
      name: 'Anti-Theft Waterproof Tech Backpack 25L',
      category: 'apparel',
      description: 'Water-resistant 900D Oxford fabric, TSA-approved 180-degree flat opening, padded compartment for 16" laptops, external USB charging port, hidden anti-theft back pocket.',
      pricePaise: BigInt(249000), // ₹2,490
      stock: 40,
      merchantScore: 0.94,
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=60',
      attributes: { capacity: '25L', laptopSize: 'Up to 16"', feature: 'Anti-Theft + USB', useCase: ['travel', 'commute', 'gear'] },
    },
    {
      sku: 'APP-TEE-003',
      name: '"Eat Sleep Code Repeat" Premium Graphic Tee',
      category: 'apparel',
      description: '100% Super-Combed Bio-Washed Cotton T-Shirt. Breathable 180 GSM fabric, high-density durable screen print.',
      pricePaise: BigInt(79900), // ₹799
      stock: 100,
      merchantScore: 0.90,
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=60',
      attributes: { material: 'Bio-Washed Cotton', fit: 'Regular', print: 'High-Density', useCase: ['casual', 'clothes', 'developer'] },
    },
    {
      sku: 'APP-GLS-004',
      name: 'Blue Light Blocking Programmer Glasses',
      category: 'apparel',
      description: 'Anti-reflective CR-39 lenses blocking 99% harmful blue light (400-450nm). Lightweight TR90 matte frame, zero distortion, reduces eyestrain.',
      pricePaise: BigInt(119000), // ₹1,190
      stock: 75,
      merchantScore: 0.93,
      imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=60',
      attributes: { blockRating: '99% Blue Light', frame: 'TR90 Lightweight', useCase: ['eyestrain', 'screen-time', 'coding'] },
    },

    // Electricals & Smart Home
    {
      sku: 'ELE-LGT-001',
      name: 'RGBIC Monitor Screen Lightbar with Remote',
      category: 'electricals',
      description: 'Asymmetric optical design illuminating desk without screen glare. Touch controls, wireless rotary dial, 16M RGB ambient backlighting, CRI > 95.',
      pricePaise: BigInt(249000), // ₹2,490
      stock: 35,
      merchantScore: 0.93,
      imageUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=800&auto=format&fit=crop&q=60',
      attributes: { illumination: 'No Glare', rgb: 'RGBIC Backlight', control: 'Rotary Wireless', useCase: ['desk-setup', 'electricals', 'lighting'] },
    },
    {
      sku: 'ELE-SUR-002',
      name: '8-Outlet Heavy Duty Surge Protector Board',
      category: 'electricals',
      description: '2500W / 10A Master Surge Protector with 525 Joules protection rating. 8 universal AC sockets + 3 USB ports, flame-retardant PC casing, 2m heavy cable.',
      pricePaise: BigInt(149000), // ₹1,490
      stock: 60,
      merchantScore: 0.92,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60',
      attributes: { power: '2500W 10A', sockets: 8, joules: '525J', cable: '2 Meter Heavy', useCase: ['electricals', 'power-safety', 'setup'] },
    },
    {
      sku: 'ELE-PLG-003',
      name: '16A Smart WiFi Plug with Energy Monitor',
      category: 'electricals',
      description: '16A High-Power Smart WiFi Plug for ACs, Geysers & Setup Rigs. Real-time electricity consumption monitoring, timer schedules, Alexa & Google Home compatible.',
      pricePaise: BigInt(99000), // ₹990
      stock: 90,
      merchantScore: 0.91,
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=60',
      attributes: { rating: '16A High Power', feature: 'Real-time Energy Monitor', voice: 'Alexa & Google', useCase: ['smart-home', 'electricals', 'automation'] },
    },

    // Accessories
    {
      sku: 'ACC-CHG-001',
      name: '65W GaN Dual USB-C Fast Charger',
      category: 'accessories',
      description: 'Gallium Nitride (GaN) fast charger, 65W Max Power Delivery, dual Type-C ports + 1 Type-A port, pocket-friendly foldable design.',
      pricePaise: BigInt(129900), // ₹1,299
      stock: 100,
      merchantScore: 0.96,
      imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=60',
      attributes: { power: '65W GaN', ports: '2x USB-C + 1x USB-A', useCase: ['travel', 'fast-charging', 'laptop-power'] },
    },
    {
      sku: 'ACC-HUB-002',
      name: '8-in-1 Aluminium USB-C Multi-Port Hub',
      category: 'accessories',
      description: 'Aluminium hub with 4K@60Hz HDMI, 100W Power Delivery pass-through, Gigabit Ethernet LAN, 3x USB 3.0 (5Gbps), SD/TF card slots.',
      pricePaise: BigInt(219000), // ₹2,190
      stock: 50,
      merchantScore: 0.91,
      imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&auto=format&fit=crop&q=60',
      attributes: { ports: 8, hdmi: '4K@60Hz', passThrough: '100W PD', useCase: ['workstation', 'docking', 'laptops'] },
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        ...item,
      },
    });
    console.log(`  📦 Seeded Product: [${product.sku}] ${product.name} — ₹${Number(product.pricePaise) / 100}`);
  }

  console.log(`\n🎉 Seed completed successfully! Seeded ${productsData.length} products into the catalog.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
