require('dotenv').config();
const { sequelize } = require('../models');

async function resetDatabase() {
    try {
        console.log('Подключение к базе данных...');
        await sequelize.authenticate();
        console.log('Подключение установлено успешно.');

        // Удаляем все таблицы
        console.log('Удаление существующих таблиц...');
        await sequelize.query('DROP TABLE IF EXISTS "Users" CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS "Сводная" CASCADE');
        
        // Создаем таблицы заново
        console.log('Создание новых таблиц...');
        await sequelize.sync({ force: true });
        
        console.log('База данных успешно сброшена');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при сбросе базы данных:', error);
        if (error.original) {
            console.error('Детали ошибки:', {
                code: error.original.code,
                message: error.original.message
            });
        }
        process.exit(1);
    }
}

resetDatabase(); 