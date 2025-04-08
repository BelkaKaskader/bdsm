require('dotenv').config();
const { Pool } = require('pg');

// Чтение конфигурации из .env файла
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function clearSvodnayaTable() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Начало очистки таблицы "Сводная"...');
        
        await client.query('DELETE FROM "Сводная"');
        
        await client.query('COMMIT');
        console.log('Таблица "Сводная" успешно очищена');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка при очистке таблицы:', err);
    } finally {
        client.release();
    }
}

clearSvodnayaTable(); 