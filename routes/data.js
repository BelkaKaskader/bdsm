const express = require('express');
const router = express.Router();
const { Сводная } = require('../models');
const auth = require('../middleware/auth');
const { sequelize } = require('sequelize');

// Получение всех данных
router.get('/', auth, async (req, res) => {
    try {
        console.log('Получение всех данных...');
        
        const data = await Сводная.findAll({
            order: [['код_окэд', 'ASC']]
        });

        console.log('Данные получены, количество записей:', data.length);
        
        res.json({
            message: 'Данные получены успешно',
            data: data
        });
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении данных',
            error: error.message 
        });
    }
});

// Получение сводных данных
router.get('/summary', auth, async (req, res) => {
    try {
        console.log('Получение сводных данных...');
        
        const data = await Сводная.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('*')), 'total_records'],
                [sequelize.fn('SUM', sequelize.col('количество_нп')), 'total_np'],
                [sequelize.fn('SUM', sequelize.col('сумма_налогов')), 'total_tax'],
                [sequelize.fn('AVG', sequelize.col('удельный_вес')), 'avg_weight']
            ]
        });

        console.log('Данные получены:', data[0]);
        
        res.json({
            message: 'Сводные данные получены успешно',
            data: data[0]
        });
    } catch (error) {
        console.error('Ошибка при получении сводных данных:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении сводных данных',
            error: error.message 
        });
    }
});

// Получение данных по коду ОКЭД
router.get('/by-oked/:code', auth, async (req, res) => {
    try {
        console.log('Получение данных по коду ОКЭД:', req.params.code);
        
        const data = await Сводная.findOne({
            where: {
                код_окэд: req.params.code
            }
        });

        if (!data) {
            return res.status(404).json({ message: 'Данные не найдены' });
        }

        res.json({
            message: 'Данные получены успешно',
            data: data
        });
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении данных',
            error: error.message 
        });
    }
});

// Получение списка всех кодов ОКЭД
router.get('/oked-codes', auth, async (req, res) => {
    try {
        console.log('Получение списка кодов ОКЭД...');
        
        const data = await Сводная.findAll({
            attributes: ['код_окэд', 'вид_деятельности'],
            group: ['код_окэд', 'вид_деятельности'],
            order: [['код_окэд', 'ASC']]
        });

        res.json({
            message: 'Список кодов ОКЭД получен успешно',
            data: data
        });
    } catch (error) {
        console.error('Ошибка при получении списка кодов ОКЭД:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении списка кодов ОКЭД',
            error: error.message 
        });
    }
});

module.exports = router; 