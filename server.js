require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const User = require('./models/User');

const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to BDSM API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Синхронизация базы данных и запуск сервера
sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synchronized');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database connection error:', err);
    }); 