require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function createAdmin() {
  try {
    const hash = await bcrypt.hash('admin123', 12);
    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ('Admin', 'Admin@admin.com', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET password = $1, role = 'admin'
    `, [hash]);
    console.log('✅ Admin account created/updated!');
    console.log('   Email   : Admin@admin.com');
    console.log('   Password: admin123');
    console.log('   Role    : admin');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
