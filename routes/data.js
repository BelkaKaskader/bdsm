const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Company = require('../models/Company');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Получение списка всех компаний
router.get('/companies', auth, async (req, res) => {
    try {
        const companies = await Company.findAll({
            include: [{
                model: Report,
                attributes: ['date', 'revenue', 'profit', 'employees'],
                order: [['date', 'DESC']],
                limit: 1
            }]
        });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении списка компаний' });
    }
});

// Получение детальной информации о компании
router.get('/companies/:id', auth, async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id, {
            include: [{
                model: Report,
                order: [['date', 'DESC']]
            }]
        });
        
        if (!company) {
            return res.status(404).json({ message: 'Компания не найдена' });
        }

        res.json(company);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении информации о компании' });
    }
});

// Получение статистики по всем компаниям
router.get('/statistics', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const where = {};
        if (startDate && endDate) {
            where.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        const reports = await Report.findAll({
            include: [{
                model: Company,
                attributes: ['name', 'location']
            }],
            where,
            order: [['date', 'DESC']]
        });

        // Агрегация данных для графиков
        const statistics = {
            totalRevenue: reports.reduce((sum, report) => sum + Number(report.revenue), 0),
            totalExpenses: reports.reduce((sum, report) => sum + Number(report.expenses), 0),
            totalProfit: reports.reduce((sum, report) => sum + Number(report.profit), 0),
            totalEmployees: reports.reduce((sum, report) => sum + report.employees, 0),
            companiesCount: new Set(reports.map(report => report.companyId)).size,
            monthlyData: {},
            locationData: {}
        };

        // Группировка по месяцам
        reports.forEach(report => {
            const month = new Date(report.date).toISOString().slice(0, 7);
            if (!statistics.monthlyData[month]) {
                statistics.monthlyData[month] = {
                    revenue: 0,
                    profit: 0,
                    employees: 0
                };
            }
            statistics.monthlyData[month].revenue += Number(report.revenue);
            statistics.monthlyData[month].profit += Number(report.profit);
            statistics.monthlyData[month].employees += report.employees;

            // Группировка по локациям
            const location = report.Company.location;
            if (!statistics.locationData[location]) {
                statistics.locationData[location] = {
                    revenue: 0,
                    companies: 0
                };
            }
            statistics.locationData[location].revenue += Number(report.revenue);
            statistics.locationData[location].companies = new Set(
                reports.filter(r => r.Company.location === location)
                    .map(r => r.companyId)
            ).size;
        });

        res.json(statistics);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении статистики' });
    }
});

// Получение отчетов по компании
router.get('/companies/:id/reports', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const where = {
            companyId: req.params.id
        };
        
        if (startDate && endDate) {
            where.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        const reports = await Report.findAll({
            where,
            order: [['date', 'DESC']]
        });

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении отчетов компании' });
    }
});

// Получение списка локаций
router.get('/locations', auth, async (req, res) => {
    try {
        const locations = await Company.findAll({
            attributes: ['location'],
            group: ['location']
        });
        res.json(locations.map(loc => loc.location));
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении списка локаций' });
    }
});

// Получение компаний по локации
router.get('/locations/:location/companies', auth, async (req, res) => {
    try {
        const companies = await Company.findAll({
            where: {
                location: req.params.location
            },
            include: [{
                model: Report,
                attributes: ['date', 'revenue', 'profit', 'employees'],
                order: [['date', 'DESC']],
                limit: 1
            }]
        });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении компаний по локации' });
    }
});

// Добавление новой компании (только для администраторов)
router.post('/companies', auth, adminAuth, async (req, res) => {
    try {
        const { name, location, description } = req.body;
        const company = await Company.create({ name, location, description });
        res.status(201).json(company);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании компании' });
    }
});

// Добавление отчета (только для администраторов)
router.post('/reports', auth, adminAuth, async (req, res) => {
    try {
        const { companyId, date, revenue, expenses, profit, employees, description } = req.body;
        const report = await Report.create({
            companyId,
            date,
            revenue,
            expenses,
            profit,
            employees,
            description
        });
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании отчета' });
    }
});

// Обновление данных компании (только для администраторов)
router.put('/companies/:id', auth, adminAuth, async (req, res) => {
    try {
        const { name, location, description } = req.body;
        const company = await Company.findByPk(req.params.id);
        
        if (!company) {
            return res.status(404).json({ message: 'Компания не найдена' });
        }

        await company.update({ name, location, description });
        res.json(company);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении данных компании' });
    }
});

// Обновление отчета (только для администраторов)
router.put('/reports/:id', auth, adminAuth, async (req, res) => {
    try {
        const { date, revenue, expenses, profit, employees, description } = req.body;
        const report = await Report.findByPk(req.params.id);
        
        if (!report) {
            return res.status(404).json({ message: 'Отчет не найден' });
        }

        await report.update({ date, revenue, expenses, profit, employees, description });
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении отчета' });
    }
});

// Удаление компании (только для администраторов)
router.delete('/companies/:id', auth, adminAuth, async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        
        if (!company) {
            return res.status(404).json({ message: 'Компания не найдена' });
        }

        await company.destroy();
        res.json({ message: 'Компания успешно удалена' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении компании' });
    }
});

// Удаление отчета (только для администраторов)
router.delete('/reports/:id', auth, adminAuth, async (req, res) => {
    try {
        const report = await Report.findByPk(req.params.id);
        
        if (!report) {
            return res.status(404).json({ message: 'Отчет не найден' });
        }

        await report.destroy();
        res.json({ message: 'Отчет успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении отчета' });
    }
});

module.exports = router; 