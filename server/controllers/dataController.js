const { Pool } = require('pg');

// Подключение к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bdbdsm',
  password: 'admin',
  port: 5432,
});

/**
 * Получает все данные из таблицы Сводная с возможностью фильтрации
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.getAllData = async (req, res) => {
  try {
    console.log('Получение данных из таблицы Сводная...');
    
    // Формируем запрос с возможностью фильтрации
    let query = 'SELECT * FROM "Сводная"';
    const queryParams = [];
    
    // Применяем фильтры, если они есть в запросе
    const whereConditions = [];
    let paramCounter = 1;
    
    if (req.query.код_окэд) {
      whereConditions.push(`код_окэд ILIKE $${paramCounter}`);
      queryParams.push(`%${req.query.код_окэд}%`);
      paramCounter++;
    }
    
    if (req.query.вид_деятельности) {
      whereConditions.push(`вид_деятельности ILIKE $${paramCounter}`);
      queryParams.push(`%${req.query.вид_деятельности}%`);
      paramCounter++;
    }
    
    if (req.query.средняя_численность_min) {
      whereConditions.push(`средняя_численность_работников >= $${paramCounter}`);
      queryParams.push(req.query.средняя_численность_min);
      paramCounter++;
    }
    
    if (req.query.средняя_численность_max) {
      whereConditions.push(`средняя_численность_работников <= $${paramCounter}`);
      queryParams.push(req.query.средняя_численность_max);
      paramCounter++;
    }
    
    if (req.query.сумма_налогов_min) {
      whereConditions.push(`сумма_налогов >= $${paramCounter}`);
      queryParams.push(req.query.сумма_налогов_min);
      paramCounter++;
    }
    
    if (req.query.сумма_налогов_max) {
      whereConditions.push(`сумма_налогов <= $${paramCounter}`);
      queryParams.push(req.query.сумма_налогов_max);
      paramCounter++;
    }
    
    // Добавляем условия WHERE, если они есть
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Добавляем сортировку по коду ОКЭД
    query += ' ORDER BY код_окэд';
    
    const result = await pool.query(query, queryParams);
    
    console.log(`Найдено ${result.rows.length} записей`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    res.status(500).json({
      message: 'Ошибка при получении данных',
      error: error.message
    });
  }
};

/**
 * Получает одну запись из таблицы Сводная по ID
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.getDataById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Получение данных по ID: ${id}`);
    
    const result = await pool.query('SELECT * FROM "Сводная" WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при получении данных по ID:', error);
    res.status(500).json({
      message: 'Ошибка при получении данных',
      error: error.message
    });
  }
};

/**
 * Поиск данных в таблице Сводная по запросу
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.searchData = async (req, res) => {
  try {
    const { query } = req.params;
    console.log(`Поиск данных по запросу: ${query}`);
    
    const result = await pool.query(`
      SELECT * FROM "Сводная" 
      WHERE код_окэд ILIKE $1 
      OR вид_деятельности ILIKE $1
      ORDER BY код_окэд
    `, [`%${query}%`]);
    
    console.log(`Найдено ${result.rows.length} записей`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при поиске данных:', error);
    res.status(500).json({
      message: 'Ошибка при поиске данных',
      error: error.message
    });
  }
}; 