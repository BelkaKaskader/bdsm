const { sequelize } = require('../models');
const { execSync } = require('child_process');
const path = require('path');

async function initDatabase() {
    try {
        console.log('=== Начало инициализации базы данных ===');

        // Сброс базы данных
        console.log('\n1. Сброс базы данных...');
        execSync('node scripts/reset-db.js', { stdio: 'inherit' });
        
        // Создание администратора
        console.log('\n2. Создание администратора...');
        execSync('node scripts/sql-reset-admin.js', { stdio: 'inherit' });
        
        // Импорт данных из Excel
        if (process.env.IMPORT_DATA === 'true') {
            console.log('\n3. Импорт данных из Excel...');
            execSync('node scripts/importExcel.js', { stdio: 'inherit' });
        }

        console.log('\n=== Инициализация базы данных завершена успешно ===');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        throw error;
    }
}

module.exports = initDatabase; 