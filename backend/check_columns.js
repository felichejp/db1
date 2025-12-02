const { Client } = require('pg');
require('dotenv').config({ path: '/home/juan/Descargas/db1/backend/.env' });

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
    try {
        await client.connect();
        const res = await client.query(`SELECT COUNT(*) FROM users`);
        console.log('User count:', res.rows[0].count);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkColumns();
