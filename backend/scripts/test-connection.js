// Script para probar la conexión a PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Verificando configuración de base de datos...\n');

// Mostrar configuración (sin mostrar la contraseña completa)
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'peer_tutoring_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ? 
    (process.env.DB_PASSWORD.length > 0 ? '***' + process.env.DB_PASSWORD.slice(-2) : 'NO CONFIGURADA') : 
    'NO CONFIGURADA'
};

console.log('📋 Configuración actual:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Host:     ${config.host}`);
console.log(`Port:     ${config.port}`);
console.log(`Database: ${config.database}`);
console.log(`User:     ${config.user}`);
console.log(`Password: ${config.password}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Verificar que las variables estén configuradas
if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.trim() === '') {
  console.error('❌ ERROR: DB_PASSWORD no está configurada en el archivo .env');
  console.log('\n💡 Solución:');
  console.log('   1. Abre el archivo .env en: backend/.env');
  console.log('   2. Asegúrate de que tenga esta línea:');
  console.log('      DB_PASSWORD=tu_contraseña_de_postgresql');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'peer_tutoring_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000
});

async function testConnection() {
  try {
    console.log('🔄 Intentando conectar a PostgreSQL...\n');
    
    // Intentar conectar
    const client = await pool.connect();
    console.log('✅ Conexión exitosa!\n');
    
    // Probar una query simple
    const result = await client.query('SELECT version()');
    console.log('📊 Versión de PostgreSQL:');
    console.log('   ' + result.rows[0].version.split(',')[0] + '\n');
    
    // Verificar si la base de datos existe y tiene tablas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`✅ Base de datos tiene ${tablesResult.rows.length} tabla(s):`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  La base de datos existe pero no tiene tablas.');
      console.log('   Necesitas ejecutar el esquema SQL:\n');
      console.log('   psql -U postgres -d peer_tutoring_db -f ../database_schema.sql\n');
    }
    
    client.release();
    await pool.end();
    
    console.log('✅ Todo está configurado correctamente!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR al conectar a PostgreSQL:\n');
    
    if (error.code === '28P01') {
      console.error('   Error: Autenticación fallida');
      console.error('   La contraseña en el archivo .env no es correcta.\n');
      console.log('💡 Soluciones:');
      console.log('   1. Verifica la contraseña de PostgreSQL:');
      console.log('      - Abre pgAdmin o usa psql');
      console.log('      - O intenta conectarte con: psql -U postgres');
      console.log('   2. Actualiza el archivo .env con la contraseña correcta:');
      console.log('      DB_PASSWORD=tu_contraseña_correcta\n');
    } else if (error.code === '3D000') {
      console.error('   Error: La base de datos no existe\n');
      console.log('💡 Solución:');
      console.log('   Crea la base de datos con:');
      console.log('   createdb -U postgres peer_tutoring_db\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Error: No se puede conectar al servidor PostgreSQL\n');
      console.log('💡 Soluciones:');
      console.log('   1. Verifica que PostgreSQL esté corriendo:');
      console.log('      - En Windows: Servicios > PostgreSQL');
      console.log('      - O ejecuta: pg_ctl start');
      console.log('   2. Verifica el host y puerto en el .env\n');
    } else {
      console.error(`   Código: ${error.code}`);
      console.error(`   Mensaje: ${error.message}\n`);
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();


