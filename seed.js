const { faker } = require('@faker-js/faker/locale/ar'); // Use Arabic locale for fake data
const { sequelize, Product, Customer, Order, Sample, User } = require('./src/models');
const bcrypt = require('bcrypt');

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    // Sync to make sure tables exist
    console.log('Syncing models...');
    await sequelize.sync({ force: true }); // WARNING: This will drop and recreate ALL tables.

    console.log('Creating Admin User...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    await User.create({
      name: 'أدمن النظام',
      email: 'admin@qreini.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('Seeding Customers...');
    const customers = [];
    for (let i = 0; i < 50; i++) {
      customers.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        totalPurchases: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 })
      });
    }
    const createdCustomers = await Customer.bulkCreate(customers);

    console.log('Seeding Products...');
    const products = [];
    const categories = ['زي مدرسي', 'زي مستشفيات', 'زي أمني', 'زي فنادق', 'أخرى'];
    for (let i = 0; i < 50; i++) {
      const isInternal = faker.datatype.boolean();
      products.push({
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 50, max: 500 }),
        sku: 'SKU-' + faker.string.alphanumeric(6).toUpperCase(),
        stock: isInternal ? faker.number.int({ min: 0, max: 200 }) : 0,
        sourceType: isInternal ? 'internal' : 'external',
        category: faker.helpers.arrayElement(categories),
        salesCount: faker.number.int({ min: 0, max: 500 })
      });
    }
    const createdProducts = await Product.bulkCreate(products);

    console.log('Seeding Orders...');
    const orders = [];
    const statuses = ['قيد المعالجة', 'قيد الشحن', 'تم التسليم', 'ملغي', 'قيد المراجعة', 'معلق'];
    for (let i = 0; i < 200; i++) {
      orders.push({
        orderNumber: '#ORD-' + faker.number.int({ min: 10000, max: 99999 }),
        status: faker.helpers.arrayElement(statuses),
        totalAmount: faker.commerce.price({ min: 100, max: 2000 }),
        customerId: faker.helpers.arrayElement(createdCustomers).id,
        createdAt: faker.date.past({ years: 1 })
      });
    }
    await Order.bulkCreate(orders);

    console.log('Seeding Samples...');
    const samples = [];
    for (let i = 0; i < 20; i++) {
      const takenAt = faker.date.recent({ days: 10 });
      const dueDate = new Date(takenAt);
      dueDate.setDate(dueDate.getDate() + 5);
      samples.push({
        productId: faker.helpers.arrayElement(createdProducts).id,
        customerName: faker.person.fullName(),
        status: faker.helpers.arrayElement(['active', 'returned', 'completed']),
        takenAt,
        dueDate,
        notificationSent: false
      });
    }
    await Sample.bulkCreate(samples);

    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
