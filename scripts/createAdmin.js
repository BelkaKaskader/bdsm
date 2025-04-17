require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');

async function createAdminUser() {
    try {
        const plainPassword = 'admin123'; // Сохраняем исходный пароль в отдельную переменную
        
        console.group('=== Создание администратора ===');
        console.log('Исходный пароль:', plainPassword);
        
        // Данные администратора без пароля
        const adminData = {
            id: uuidv4(),
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('Проверка существующего администратора...');
        const existingAdmin = await User.findOne({
            where: { username: adminData.username }
        });

        if (existingAdmin) {
            console.group('=== Обновление пароля администратора ===');
            console.log('Текущий хеш в базе:', existingAdmin.password);
            
            // Обновляем напрямую через sequelize, чтобы избежать хука beforeSave
            await existingAdmin.update({
                password: plainPassword
            });
            
            console.log('Пароль администратора обновлен');
            console.groupEnd();
        } else {
            console.group('=== Создание нового администратора ===');
            
            // Создаем пользователя с исходным паролем
            await User.create({
                ...adminData,
                password: plainPassword // Передаем исходный пароль
            });
            
            console.log('Администратор создан');
            console.groupEnd();
        }

        // Проверяем финальное состояние
        const finalAdmin = await User.findOne({
            where: { username: adminData.username }
        });
        
        console.group('=== Финальная проверка ===');
        console.log('Хеш в базе:', finalAdmin.password);
        const verifyResult = await bcrypt.compare(plainPassword, finalAdmin.password);
        console.log('Проверка пароля:', verifyResult);
        console.groupEnd();

        console.log('Учетные данные администратора:');
        console.log('Логин:', adminData.username);
        console.log('Пароль:', plainPassword);
        console.groupEnd();

    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        console.error('Стек ошибки:', error.stack);
    } finally {
        process.exit();
    }
}

createAdminUser(); 