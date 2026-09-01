const { Sample, Product } = require('../models');

// Issue a sample
exports.issueSample = async (req, res) => {
  try {
    const { productId, customerName } = req.body;
    if (!productId || !customerName) {
      return res.status(400).json({ error: 'Product ID and Customer Name are required' });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Deduct stock if internal
    if (product.sourceType === 'internal') {
      if (product.stock <= 0) {
        return res.status(400).json({ error: 'Not enough stock to issue a sample' });
      }
      product.stock -= 1;
      await product.save();
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const sample = await Sample.create({
      productId,
      customerName,
      dueDate
    });

    res.status(201).json({ message: 'Sample issued successfully', sample });
  } catch (error) {
    console.error('Error issuing sample:', error);
    res.status(500).json({ error: 'Failed to issue sample' });
  }
};

// Get all samples
exports.getSamples = async (req, res) => {
  try {
    const samples = await Sample.findAll({
      include: [{ model: Product, attributes: ['id', 'name', 'image', 'sourceType'] }],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(samples);
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Failed to fetch samples' });
  }
};

// Return a sample
exports.returnSample = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await Sample.findByPk(id, { include: [Product] });
    
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found' });
    }
    
    if (sample.status !== 'active') {
      return res.status(400).json({ error: 'Sample is not active' });
    }

    sample.status = 'returned';
    await sample.save();

    // Add stock back if internal
    if (sample.Product && sample.Product.sourceType === 'internal') {
      sample.Product.stock += 1;
      await sample.Product.save();
    }

    res.status(200).json({ message: 'Sample returned successfully', sample });
  } catch (error) {
    console.error('Error returning sample:', error);
    res.status(500).json({ error: 'Failed to return sample' });
  }
};

// Complete (Sell/Keep) a sample
exports.completeSample = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await Sample.findByPk(id);
    
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found' });
    }
    
    if (sample.status !== 'active') {
      return res.status(400).json({ error: 'Sample is not active' });
    }

    sample.status = 'completed';
    await sample.save();

    res.status(200).json({ message: 'Sample completed successfully', sample });
  } catch (error) {
    console.error('Error completing sample:', error);
    res.status(500).json({ error: 'Failed to complete sample' });
  }
};
