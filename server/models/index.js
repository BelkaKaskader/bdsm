const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: '../../.env' });

// Подключение с использованием DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

// Импортируем модель User
const UserModel = require('./User');
const User = UserModel(sequelize);

const Сводная = sequelize.define('Сводная', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    код_окэд: {
        type: DataTypes.STRING,
        allowNull: false
    },
    вид_деятельности: {
        type: DataTypes.STRING,
        allowNull: false
    },
    количество_нп: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    средняя_численность_работников: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Сумма_по_полю_ФОТт: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
    },
    Сумма_по_полю_ср_зп: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
    },
    сумма_налогов: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
    },
    удельный_вес: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
    }
}, {
    tableName: 'Сводная',
    timestamps: true
});

// Экспортируем все модели
module.exports = {
    sequelize,
    Сводная,
    User
}; 