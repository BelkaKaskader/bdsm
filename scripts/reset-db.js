require('dotenv').config();
const { sequelize } = require('../server/models');

async function resetDatabase() {
    try {
        console.log('Начинаем сброс базы данных...');
        
        // Удаляем все таблицы
        console.log('Удаляем существующие таблицы...');
        await sequelize.query('DROP TABLE IF EXISTS "Users" CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS "Сводная" CASCADE');
        
        // Создаем таблицы заново
        console.log('Создаем таблицы заново...');
        await sequelize.sync({ force: true });
        
        console.log('База данных успешно сброшена');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при сбросе базы данных:', error);
        process.exit(1);
    }
}

// Запускаем сброс базы данных
resetDatabase(); 