const { 
  sequelize, 
  Product, 
  Customer, 
  Order, 
  OrderItem, 
  User,
  Offer,
  Design,
  Notification,
  Conversation,
  Message,
  Setting,
  Sample,
  Category,
  B2BRequest
} = require('../src/models');
const { faker } = require('@faker-js/faker/locale/ar');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    // Recreate the database structure
    await sequelize.sync({ force: true });
    console.log('Database synced. Starting to seed data...');

    // 1. Users
    const passwordHash = await bcrypt.hash('123456', 10);
    const users = [];
    for (let i = 0; i < 5; i++) {
      users.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: passwordHash,
        role: faker.helpers.arrayElement(['admin', 'sales', 'support']),
        status: faker.helpers.arrayElement(['active', 'inactive'])
      });
    }
    // Add one main admin
    users.push({
      name: 'مدير النظام',
      email: 'admin@qreini.com',
      password: passwordHash,
      role: 'admin',
      status: 'active'
    });
    await User.bulkCreate(users);

    // 2. Settings
    await Setting.bulkCreate([
      { key: 'site_name', value: 'نظام القريني' },
      { key: 'support_email', value: 'support@qreini.com' },
      { key: 'phone', value: '0500000000' }
    ]);

    // 3. Categories
    const categories = [];
    for (let i = 0; i < 6; i++) {
      categories.push({
        label: faker.commerce.department(),
        sub: faker.commerce.department(),
        iconName: 'tag',
        color: faker.color.rgb(),
        iconColor: '#ffffff'
      });
    }
    await Category.bulkCreate(categories);

    // 4. Customers
    const customers = [];
    for (let i = 0; i < 20; i++) {
      customers.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        totalPurchases: faker.finance.amount({ min: 100, max: 10000, dec: 2 }),
        lastVisit: faker.date.recent()
      });
    }
    const createdCustomers = await Customer.bulkCreate(customers, { returning: true });

    // 5. Products
    const products = [];
    for (let i = 0; i < 30; i++) {
      products.push({
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 50, max: 1000 }),
        sku: faker.string.alphanumeric(8).toUpperCase(),
        stock: faker.number.int({ min: 0, max: 500 }),
        type: faker.helpers.arrayElement(['internal', 'external']),
        materials: faker.commerce.productMaterial(),
        color: faker.color.human(),
        salesCount: faker.number.int({ min: 0, max: 2000 }),
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop'
      });
    }
    const createdProducts = await Product.bulkCreate(products, { returning: true });

    // 6. Samples
    const samples = [];
    for (let i = 0; i < 15; i++) {
      samples.push({
        productId: faker.helpers.arrayElement(createdProducts).id,
        serialNumber: faker.string.uuid(),
        status: faker.helpers.arrayElement(['active', 'returned', 'completed']),
        requestDate: faker.date.past(),
        returnDate: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.5 }),
        withDesign: faker.datatype.boolean()
      });
    }
    await Sample.bulkCreate(samples);

    // 7. Orders & OrderItems
    const statuses = ['قيد المعالجة', 'قيد الشحن', 'تم التسليم', 'ملغي', 'قيد المراجعة', 'معلق'];
    for (let i = 0; i < 40; i++) {
      const order = await Order.create({
        orderNumber: `#ORD-${faker.number.int({ min: 1000, max: 9999 })}`,
        status: faker.helpers.arrayElement(statuses),
        totalAmount: faker.finance.amount({ min: 100, max: 5000, dec: 2 }),
        customerId: faker.helpers.arrayElement(createdCustomers).id,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent()
      });

      // Add 1-4 items per order
      const itemsCount = faker.number.int({ min: 1, max: 4 });
      for (let j = 0; j < itemsCount; j++) {
        const product = faker.helpers.arrayElement(createdProducts);
        await OrderItem.create({
          OrderId: order.id,
          ProductId: product.id,
          quantity: faker.number.int({ min: 1, max: 5 }),
          priceAtPurchase: product.price
        });
      }
    }

    // 8. Offers
    const offers = [];
    for (let i = 0; i < 5; i++) {
      offers.push({
        title: faker.commerce.productAdjective() + ' Offer',
        description: faker.lorem.sentence(),
        type: faker.helpers.arrayElement(['percentage', 'fixed']),
        status: faker.helpers.arrayElement(['active', 'expired']),
        expiryDate: faker.date.future().toISOString()
      });
    }
    await Offer.bulkCreate(offers);

    // 9. Designs
    const designs = [];
    for (let i = 0; i < 10; i++) {
      designs.push({
        title: faker.commerce.productName() + ' Design',
        description: faker.lorem.paragraph(),
        attachedFile: 'design_template.pdf',
        status: faker.helpers.arrayElement(['معتمد', 'قيد المراجعة', 'مسودة']),
        customerName: faker.person.fullName(),
        requestDate: faker.date.recent().toISOString()
      });
    }
    await Design.bulkCreate(designs);

    // 10. Notifications
    const notifications = [];
    for (let i = 0; i < 20; i++) {
      notifications.push({
        type: faker.helpers.arrayElement(['order', 'message', 'alert', 'success']),
        title: faker.lorem.words(3),
        message: faker.lorem.sentence(),
        isRead: faker.datatype.boolean()
      });
    }
    await Notification.bulkCreate(notifications);

    // 11. Conversations & Messages
    for (let i = 0; i < 5; i++) {
      const conversation = await Conversation.create({
        name: faker.person.fullName(),
        unreadCount: faker.number.int({ min: 0, max: 5 }),
        online: faker.datatype.boolean()
      });

      const messagesCount = faker.number.int({ min: 3, max: 10 });
      const messages = [];
      for (let j = 0; j < messagesCount; j++) {
        messages.push({
          text: faker.lorem.sentence(),
          sender: faker.helpers.arrayElement(['admin', 'customer']),
          conversationId: conversation.id
        });
      }
      await Message.bulkCreate(messages);
    }

    // 12. B2B Requests
    const b2bRequests = [];
    for (let i = 0; i < 15; i++) {
      b2bRequests.push({
        companyName: faker.company.name(),
        contactName: faker.person.fullName(),
        phone: faker.phone.number(),
        itemType: faker.helpers.arrayElement(['school', 'medical', 'security', 'hotel']),
        quantity: faker.number.int({ min: 10, max: 1000 }),
        estimatedTotal: faker.finance.amount({ min: 1000, max: 50000, dec: 2 }),
        status: faker.helpers.arrayElement(['new', 'reviewed', 'completed', 'rejected'])
      });
    }
    await B2BRequest.bulkCreate(b2bRequests);

    console.log('Seeding completed successfully! All tables have been populated with dummy data.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
