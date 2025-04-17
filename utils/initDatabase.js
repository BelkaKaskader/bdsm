const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function initDatabase() {
    try {
        console.log('=== Начало инициализации базы данных ===');

        // Сброс и создание таблиц
        console.log('1. Сброс и создание таблиц...');
        await sequelize.sync({ force: true });

        // Создание администратора напрямую
        console.log('2. Создание администратора...');
        const { User } = require('../models');
        
        // Получаем пароль из .env или используем значение по умолчанию
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        
        console.log('Создание администратора...');
        console.log('- Пароль:', password);
        
        // Создаем администратора
        await User.create({
            id: uuidv4(),
            username: process.env.ADMIN_USERNAME || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: password,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Проверка создания админа
        const admin = await User.findOne({ 
            where: { username: process.env.ADMIN_USERNAME || 'admin' } 
        });
        
        if (admin) {
            console.log('Администратор успешно создан');
            console.log('- ID:', admin.id);
            console.log('- Логин:', admin.username);
            console.log('- Пароль:', admin.password);
            console.log('- Роль:', admin.role);
        } else {
            throw new Error('Ошибка создания администратора');
        }

        // Импорт данных из Excel если нужно
        if (process.env.IMPORT_DATA === 'true') {
            console.log('3. Импорт данных из Excel...');
            const importExcel = require('../scripts/importExcel');
            await importExcel();
        }

        console.log('=== Инициализация базы данных завершена успешно ===');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        throw error;
    }
}

module.exports = initDatabase; 