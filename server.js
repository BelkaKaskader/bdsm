require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const User = require('./models/User');
const path = require('path');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app first
app.use(express.static(path.join(__dirname, 'client/build')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api', apiRoutes);

// For any other route, send the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
let server;

// Функция для корректного завершения работы сервера
const gracefulShutdown = () => {
    console.log('Получен сигнал завершения. Закрываем сервер...');
    if (server) {
        server.close(() => {
            console.log('Сервер остановлен');
            sequelize.close().then(() => {
                console.log('Соединение с базой данных закрыто');
                process.exit(0);
            });
        });
    } else {
        process.exit(0);
    }
};

// Обработка сигналов завершения
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// В Windows также обрабатываем SIGBREAK
if (process.platform === 'win32') {
    process.on('SIGBREAK', gracefulShutdown);
}

// Синхронизация базы данных и запуск сервера
sequelize.sync({ alter: true })
    .then(() => {
        console.log('База данных синхронизирована');
        
        // Создаем сервер с обработкой ошибок
        server = app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Порт ${PORT} занят. Пытаемся освободить...`);
                require('child_process').exec(`npx kill-port ${PORT}`, (error) => {
                    if (!error) {
                        console.log(`Порт ${PORT} освобожден. Перезапускаем сервер...`);
                        server = app.listen(PORT, () => {
                            console.log(`Сервер успешно запущен на порту ${PORT}`);
                        });
                    } else {
                        console.error(`Не удалось освободить порт ${PORT}:`, error);
                        process.exit(1);
                    }
                });
            } else {
                console.error('Ошибка запуска сервера:', err);
                process.exit(1);
            }
        });
    })
    .catch(err => {
        console.error('Ошибка при синхронизации базы данных:', err);
        process.exit(1);
    }); 