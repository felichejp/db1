const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Para RDS de AWS
  }
});

async function createAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123';
  const nombre = 'Administrador';
  const role = 'Admin';

  try {
    // Verificar si ya existe
    const checkResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (checkResult.rows.length > 0) {
      console.log('❌ El usuario admin ya existe');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      await pool.end();
      return;
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO users (email, "passwordHash", nombre, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nombre, role`,
      [email, passwordHash, nombre, role]
    );

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Rol:      ${role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();

