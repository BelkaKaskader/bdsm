require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');
const { User } = require('../models');

async function createAdminUser() {
    try {
        console.group('=== Создание администратора ===');
        
        // Данные администратора
        const adminData = {
            id: uuidv4(),
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('Проверка существующего администратора...');
        const existingAdmin = await User.findOne({
            where: { username: adminData.username }
        });

        // Тестируем хеширование отдельно
        console.group('=== Тест хеширования ===');
        console.log('Исходный пароль:', adminData.password);
        console.log('Длина исходного пароля:', adminData.password.length);
        
        const testSalt = await bcrypt.genSalt(10);
        console.log('Тестовая соль:', testSalt);
        
        const testHash = await bcrypt.hash(adminData.password, testSalt);
        console.log('Тестовый хеш:', testHash);
        
        // Проверяем тестовое хеширование
        const testVerify = await bcrypt.compare(adminData.password, testHash);
        console.log('Тестовая проверка хеша:', testVerify);
        console.groupEnd();

        if (existingAdmin) {
            console.group('=== Обновление пароля администратора ===');
            console.log('Текущий хеш в базе:', existingAdmin.password);
            
            const salt = await bcrypt.genSalt(10);
            console.log('Новая соль:', salt);
            
            const hashedPassword = await bcrypt.hash(adminData.password, salt);
            console.log('Новый хеш:', hashedPassword);
            
            // Проверяем новый хеш
            const verifyNew = await bcrypt.compare(adminData.password, hashedPassword);
            console.log('Проверка нового хеша:', verifyNew);
            
            await existingAdmin.update({
                password: hashedPassword
            });
            
            console.log('Пароль администратора успешно обновлен');
            console.groupEnd();
        } else {
            console.group('=== Создание нового администратора ===');
            const salt = await bcrypt.genSalt(10);
            console.log('Соль для нового администратора:', salt);
            
            const hashedPassword = await bcrypt.hash(adminData.password, salt);
            console.log('Хеш для нового администратора:', hashedPassword);
            
            // Проверяем хеш
            const verifyNew = await bcrypt.compare(adminData.password, hashedPassword);
            console.log('Проверка хеша нового администратора:', verifyNew);
            
            await User.create({
                ...adminData,
                password: hashedPassword
            });
            
            console.log('Администратор успешно создан');
            console.groupEnd();
        }

        // Проверяем финальное состояние
        const finalAdmin = await User.findOne({
            where: { username: adminData.username }
        });
        
        console.group('=== Финальная проверка ===');
        console.log('Хеш в базе:', finalAdmin.password);
        const finalVerify = await bcrypt.compare(adminData.password, finalAdmin.password);
        console.log('Проверка сохраненного хеша:', finalVerify);
        console.groupEnd();

        console.log('Учетные данные администратора:');
        console.log('Логин:', adminData.username);
        console.log('Пароль:', adminData.password);
        console.groupEnd();

    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        console.error('Стек ошибки:', error.stack);
    } finally {
        process.exit();
    }
}

createAdminUser(); 