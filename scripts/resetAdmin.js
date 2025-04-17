require('dotenv').config();
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function resetAdmin() {
    try {
        console.group('=== Сброс пользователя admin ===');
        
        // Удаляем существующего admin
        console.log('Удаление существующего пользователя admin...');
        await User.destroy({
            where: {
                username: 'admin'
            }
        });
        console.log('Существующий пользователь admin удален');

        // Создаем нового admin
        const plainPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        console.log('Создание нового пользователя admin...');
        console.log('Исходный пароль:', plainPassword);
        console.log('Сгенерированный хеш:', hashedPassword);

        const admin = await User.create({
            id: uuidv4(),
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword, // Передаем уже хешированный пароль
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('Новый пользователь admin создан:', {
            id: admin.id,
            username: admin.username,
            role: admin.role
        });

        // Проверяем созданного пользователя
        const verifyAdmin = await User.findOne({
            where: { username: 'admin' }
        });

        console.log('Проверка созданного пользователя:');
        console.log('ID:', verifyAdmin.id);
        console.log('Логин:', verifyAdmin.username);
        console.log('Роль:', verifyAdmin.role);
        console.log('Хеш пароля:', verifyAdmin.password);

        // Проверяем пароль
        const isValid = await bcrypt.compare(plainPassword, verifyAdmin.password);
        console.log('Проверка пароля:', isValid);

        console.log('Учетные данные для входа:');
        console.log('Логин: admin');
        console.log('Пароль:', plainPassword);

        console.groupEnd();
    } catch (error) {
        console.error('Ошибка при сбросе пользователя admin:', error);
        console.error('Стек ошибки:', error.stack);
    } finally {
        process.exit();
    }
}

resetAdmin(); 