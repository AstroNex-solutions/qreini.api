const { sequelize, Product, Customer, Order, OrderItem } = require('../src/models');

async function seed() {
  try {
    await sequelize.sync({ force: false });

    // Customers
    const c1 = await Customer.create({ name: 'سارة أحمد', email: 'sara@example.com', phone: '0501234567' });
    const c2 = await Customer.create({ name: 'محمد علي', email: 'mohammad@example.com', phone: '0501234568' });
    const c3 = await Customer.create({ name: 'نورة خالد', email: 'noura@example.com', phone: '0501234569' });

    // Products
    const p1 = await Product.create({ name: 'تيشيرت القطن', price: 100, category: 'تيشيرتات', salesCount: 1250, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop' });
    const p2 = await Product.create({ name: 'هودي أسود', price: 200, category: 'هوديز', salesCount: 980, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&h=100&fit=crop' });
    const p3 = await Product.create({ name: 'بنطلون رياضي', price: 150, category: 'ملابس رياضية', salesCount: 620, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&h=100&fit=crop' });

    // Orders
    // Distribute orders over current year months
    const currentYear = new Date().getFullYear();
    const months = [0, 1, 2, 3, 4, 5, 6, 7]; // Jan to Aug
    const statuses = ['تم التسليم', 'قيد الشحن', 'قيد المعالجة', 'ملغي'];

    for (let i = 1; i <= 20; i++) {
      const month = months[i % months.length];
      const date = new Date(currentYear, month, Math.floor(Math.random() * 28) + 1);
      
      const order = await Order.create({
        orderNumber: `#100${i}`,
        status: statuses[i % statuses.length],
        totalAmount: (Math.random() * 500 + 100).toFixed(2),
        customerId: i % 2 === 0 ? c1.id : c2.id,
        createdAt: date,
        updatedAt: date
      });

      // Just to populate some order items if needed
      await OrderItem.create({ OrderId: order.id, ProductId: p1.id, quantity: 1, priceAtPurchase: 100 });
    }

    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
