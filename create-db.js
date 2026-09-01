const mysql = require('mysql2/promise');

async function createDB() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('Connected to MySQL');
    await connection.query('CREATE DATABASE IF NOT EXISTS qreini_db2');
    console.log('Created database qreini_db2');

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

createDB();
