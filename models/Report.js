const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Company = require('./Company');

const Report = sequelize.define('Report', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Company,
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    revenue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    expenses: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    profit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    employees: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    }
});

// Определяем связи
Company.hasMany(Report);
Report.belongsTo(Company);

module.exports = Report; 