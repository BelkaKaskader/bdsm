const { sequelize } = require('../models');

async function resetDatabase() {
    try {
        // Удаляем все таблицы
        await sequelize.query('DROP TABLE IF EXISTS "Users" CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS "Сводная" CASCADE');
        
        // Создаем таблицы заново
        await sequelize.sync({ force: true });
        
        console.log('База данных успешно сброшена');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при сбросе базы данных:', error);
        process.exit(1);
    }
}

resetDatabase(); 