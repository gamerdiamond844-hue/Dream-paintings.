const { Pool } = require('pg');

const rawConnection = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'password'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'dream_paintings'}`;

// Strip sslmode from URL — SSL is handled via the ssl config object below
const connectionString = rawConnection.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');

const isNeon = connectionString.includes('neon.tech');
const useSSL = isNeon || process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'artist', 'admin')),
        avatar_url TEXT,
        bio TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS paintings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        artist_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        admin_message TEXT,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, painting_id)
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        painting_id INTEGER REFERENCES paintings(id),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(20) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        painting_id INTEGER REFERENCES paintings(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        payment_proof TEXT,
        transaction_id VARCHAR(200),
        payment_gateway VARCHAR(100),
        payment_id VARCHAR(200),
        payment_order_id VARCHAR(200),
        payment_signature VARCHAR(200),
        payment_status VARCHAR(50) DEFAULT 'pending',
        full_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        whatsapp VARCHAR(20),
        alternate_contact VARCHAR(20),
        email VARCHAR(150) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(200),
        notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Run migrations for existing tables
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS admin_message TEXT;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS offer_start TIMESTAMP;
      ALTER TABLE paintings ADD COLUMN IF NOT EXISTS offer_end TIMESTAMP;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(200);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_order_id VARCHAR(200);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_signature VARCHAR(200);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
    `);
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paintings' AND column_name='status') THEN
          ALTER TABLE paintings DROP CONSTRAINT IF EXISTS paintings_status_check;
          ALTER TABLE paintings ADD CONSTRAINT paintings_status_check CHECK (status IN ('pending','approved','rejected','sold'));
        END IF;
      END $$;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(200) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(20) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        painting_id INTEGER REFERENCES paintings(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        payment_proof TEXT,
        transaction_id VARCHAR(200),
        payment_gateway VARCHAR(100),
        payment_id VARCHAR(200),
        payment_order_id VARCHAR(200),
        payment_signature VARCHAR(200),
        payment_status VARCHAR(50) DEFAULT 'pending',
        full_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        whatsapp VARCHAR(20),
        alternate_contact VARCHAR(20),
        email VARCHAR(150) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(200),
        notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100),
        quote TEXT NOT NULL,
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master_artist BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram VARCHAR(200);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(200);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(200);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        painting_id INTEGER REFERENCES paintings(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','offer','quick')),
        offer_amount DECIMAL(10,2),
        offer_status VARCHAR(20) DEFAULT 'pending' CHECK (offer_status IN ('pending','accepted','rejected','countered')),
        image_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(buyer_id, seller_id)
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent DECIMAL(5,2) NOT NULL,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (blocker_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS saved_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(200),
        mobile VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Chat-specific migrations (safe to run repeatedly)
    await client.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
    `);
    // ── Google OAuth migrations ─────────────────────────────────────────────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email'
        CHECK (auth_provider IN ('email', 'google'));
      ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
    `);

    // ── Verification system migrations ────────────────────────────────────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_level VARCHAR(20) DEFAULT NULL
        CHECK (badge_level IN ('red','blue') OR badge_level IS NULL);

      CREATE TABLE IF NOT EXISTS verification_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(200) NOT NULL,
        reason TEXT NOT NULL,
        portfolio_links TEXT,
        document_url TEXT,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected')),
        badge_level VARCHAR(20) DEFAULT 'red'
          CHECK (badge_level IN ('red','blue')),
        rejection_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Payment columns for verification_requests (safe to run repeatedly)
    await client.query(`
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid','pending','paid'));
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_proof TEXT;
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(200);
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50);
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_id VARCHAR(200);
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_order_id VARCHAR(200);
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS payment_signature VARCHAR(200);
      ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
    `);

    // ── Withdrawal system ─────────────────────────────────────────────────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawable_balance DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(10,2) DEFAULT 0;

      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        original_amount DECIMAL(10,2) NOT NULL,
        modified_amount DECIMAL(10,2),
        hold_amount DECIMAL(10,2) DEFAULT 0,
        final_amount DECIMAL(10,2),
        bank_name VARCHAR(200) NOT NULL,
        account_number_enc TEXT NOT NULL,
        ifsc_code VARCHAR(20) NOT NULL,
        upi_id VARCHAR(200),
        full_name VARCHAR(200) NOT NULL,
        note TEXT,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected','on_hold','paid')),
        admin_action_reason TEXT,
        updated_by VARCHAR(100) DEFAULT 'DreamPaintings Team',
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        policy_agreed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS withdrawal_audit_logs (
        id SERIAL PRIMARY KEY,
        withdrawal_id INTEGER REFERENCES withdrawals(id) ON DELETE CASCADE,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        old_amount DECIMAL(10,2),
        new_amount DECIMAL(10,2),
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
