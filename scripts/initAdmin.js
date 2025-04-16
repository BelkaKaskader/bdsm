require('dotenv').config();
const { User } = require('../models');

async function initAdmin() {
    try {
        // Проверяем, существует ли уже администратор
        const adminExists = await User.findOne({
            where: {
                role: 'admin'
            }
        });

        if (adminExists) {
            console.log('Администратор уже существует');
            process.exit(0);
        }

        // Создаем администратора
        const admin = await User.create({
            username: 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: 'admin123', // Пароль будет захеширован автоматически
            role: 'admin',
            isBlocked: false
        });

        console.log('Администратор успешно создан:');
        console.log(`Username: ${admin.username}`);
        console.log(`Email: ${admin.email}`);
        console.log('Пароль: admin123');
        console.log('Пожалуйста, измените пароль после первого входа');

        process.exit(0);
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        process.exit(1);
    }
}

initAdmin(); 