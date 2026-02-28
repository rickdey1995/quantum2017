/**
 * Database Seed Script for Default Packages
 * Run this script to populate the database with default/sample packages
 * Usage: node scripts/seed-packages.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const defaultPackages = [
  {
    name: 'Desktop Software',
    description: 'Manage Yourself - Desktop Software for DIY traders with Community Access',
    price: 4999,
    currency: '₹',
    features: [
      'Desktop Software',
      'DIY',
      'Community Access',
      'Manage Yourself',
      'Local Execution',
    ],
    display_order: 0,
    active: true,
  },
  {
    name: 'Auto Server',
    description: 'Fully Automated Server based execution for hands-free trading',
    price: 5999,
    currency: '₹',
    features: [
      'Fully Automated',
      'Server based Execution',
      'Priority Support',
      '24/7 Monitoring',
      'Execution Management',
    ],
    display_order: 1,
    active: true,
  },
  {
    name: 'Hybrid Plan',
    description: 'Combination of Desktop Software and Server Execution',
    price: 7999,
    currency: '₹',
    features: [
      'Desktop Software',
      'Server Execution',
      'Advanced Analytics',
      'Priority Support',
      'API Access',
      'Custom Strategies',
    ],
    display_order: 2,
    active: true,
  },
];

async function seedPackages() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quantum',
    });

    console.log('Connected to database...');

    // Check if packages already exist
    const [existingPackages] = await connection.query(
      'SELECT COUNT(*) as count FROM packages'
    );

    if (existingPackages[0].count > 0) {
      console.log(`Database already has ${existingPackages[0].count} package(s). Skipping seed.`);
      console.log('To re-seed, delete existing packages first.');
      await connection.end();
      return;
    }

    console.log('Seeding default packages...');

    for (const pkg of defaultPackages) {
      const { name, description, price, currency, features, display_order, active } = pkg;

      const query = `
        INSERT INTO packages 
        (id, name, description, price, currency, features, display_order, active, created_at, updated_at)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        name,
        description,
        price,
        currency,
        JSON.stringify(features),
        display_order,
        active,
      ];

      await connection.execute(query, values);
      console.log(`✓ Created package: ${name}`);
    }

    console.log('\n✓ Seed completed successfully!');
    console.log(`Total packages created: ${defaultPackages.length}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seed if this is the main module
if (require.main === module) {
  seedPackages().catch(console.error);
}

module.exports = { seedPackages, defaultPackages };
