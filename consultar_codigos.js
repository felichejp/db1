// Script para consultar códigos generados desde la base de datos
// Ejecutar con: node consultar_codigos.js

require('dotenv').config({ path: './backend/.env' });
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function consultarCodigos() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');


    // Mostrar el más reciente destacado
    const ultimo = await client.query(`
      SELECT 
        l.id as "idLead",
        l.name as "nombre",
        cl.code as "codigo"
      FROM lead l
      INNER JOIN "codeLead" cl ON l.id = cl."idLead"
      ORDER BY l.id DESC
      LIMIT 1;
    `);

    if (ultimo.rows.length > 0) {
      console.log('\n🎯 Código más reciente:');
      console.log(`   Lead ID: ${ultimo.rows[0].idLead}`);
      console.log(`   Nombre: ${ultimo.rows[0].nombre}`);
      console.log(`   Código: ${ultimo.rows[0].codigo}`);
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

consultarCodigos();

