require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Чтение конфигурации из .env файла
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Функция для преобразования даты из Excel в формат PostgreSQL
function excelDateToJSDate(excelDate) {
  // Если дата уже в формате строки, возвращаем её
  if (typeof excelDate === 'string') {
    return excelDate;
  }
  
  // Если дата - это число (Excel формат)
  if (typeof excelDate === 'number') {
    // Excel использует 1 января 1900 как начальную дату
    // Но есть ошибка в Excel, где 1900 год считается високосным
    // Поэтому нужно вычесть 2 дня
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date((excelDate - 25569) * millisecondsPerDay);
    
    // Форматируем дату в формат YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Если дата - это объект Date
  if (excelDate instanceof Date) {
    const year = excelDate.getFullYear();
    const month = String(excelDate.getMonth() + 1).padStart(2, '0');
    const day = String(excelDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Если что-то другое, возвращаем текущую дату
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Функция для импорта данных из Excel
async function importFromExcel(excelFilePath) {
    try {
        console.log(`\n=== Начало импорта данных из файла: ${excelFilePath} ===`);
        
        // Читаем Excel файл
        const workbook = XLSX.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        console.log(`Имя листа: ${sheetName}`);
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Получаем диапазон данных
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log(`Диапазон данных: от A1 до ${XLSX.utils.encode_cell(range.e)}`);
        
        // Получаем заголовки из первой строки
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({r: 0, c: C})];
            if (cell && cell.v) {
                headers.push(cell.v);
            }
        }
        console.log('\nЗаголовки в Excel файле:');
        headers.forEach((header, index) => {
            console.log(`${index + 1}. ${header}`);
        });
        
        // Читаем все данные из Excel
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: headers,
            range: 1 // Начинаем со второй строки
        });
        
        console.log(`\nНайдено ${rawData.length} записей в Excel файле`);
        
        // Выводим первую запись для проверки
        if (rawData.length > 0) {
            console.log('\nПример первой записи:');
            console.log(JSON.stringify(rawData[0], null, 2));
        }
        
        // Подключаемся к базе данных
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            console.log('\nНачало транзакции');
            
            let importedCount = 0;
            let skippedCount = 0;
            
            for (const row of rawData) {
                // Пропускаем пустые строки и строки с "Общий итог"
                if (!row['Код ОКЭД'] || row['Код ОКЭД'] === 'Общий итог') {
                    console.log(`Пропускаем строку: ${row['Код ОКЭД'] || 'пустая строка'}`);
                    skippedCount++;
                    continue;
                }
                
                // Проверяем наличие обязательных полей
                if (!row['Вид деятельности']) {
                    console.log(`Пропускаем строку с пустым видом деятельности: ${row['Код ОКЭД']}`);
                    skippedCount++;
                    continue;
                }
                
                console.log(`\nОбработка записи: ${row['Код ОКЭД']} - ${row['Вид деятельности']}`);
                
                // Проверяем, существует ли уже запись с таким кодом ОКЭД
                const existingRecord = await client.query(
                    'SELECT id FROM "Сводная" WHERE "код_окэд" = $1',
                    [row['Код ОКЭД']]
                );
                
                if (existingRecord.rows.length === 0) {
                    console.log('Добавление новой записи...');
                    
                    // Преобразуем удельный вес в число с двумя знаками после запятой
                    let удельныйВес = 0;
                    if (row['Удельный вес %']) {
                        if (typeof row['Удельный вес %'] === 'number') {
                            удельныйВес = parseFloat(row['Удельный вес %'].toFixed(2));
                        } else {
                            const cleanValue = String(row['Удельный вес %']).replace('%', '').trim();
                            удельныйВес = parseFloat(cleanValue) || 0;
                        }
                    }
                    
                    // Получаем значения из Excel, если они есть, иначе используем 0
                    let средняяЧисленность = '0';
                    
                    // Проверяем наличие поля "Средняя численность работников"
                    console.log('Проверка поля "Средняя численность работников":');
                    console.log(`- Значение: ${row['Средняя численность работников']}`);
                    console.log(`- Тип: ${typeof row['Средняя численность работников']}`);
                    console.log(`- Существует: ${row['Средняя численность работников'] !== undefined}`);
                    console.log(`- Не null: ${row['Средняя численность работников'] !== null}`);
                    console.log(`- Не пустая строка: ${row['Средняя численность работников'] !== ''}`);
                    
                    // Проверяем все возможные варианты имени столбца
                    const возможныеИменаСтолбца = [
                        'Средняя численность работников',
                        'Средняя численность',
                        'Численность работников',
                        'Средняя численность сотрудников',
                        'Численность сотрудников'
                    ];
                    
                    let значениеСреднейЧисленности = null;
                    
                    // Ищем значение по всем возможным именам столбца
                    for (const имяСтолбца of возможныеИменаСтолбца) {
                        if (row[имяСтолбца] !== undefined && row[имяСтолбца] !== null && row[имяСтолбца] !== '') {
                            значениеСреднейЧисленности = row[имяСтолбца];
                            console.log(`Найдено значение в столбце "${имяСтолбца}": ${значениеСреднейЧисленности}`);
                            break;
                        }
                    }
                    
                    // Преобразуем значение в число с плавающей точкой
                    if (значениеСреднейЧисленности !== null) {
                        console.log(`Обработка значения "Средняя численность работников": ${значениеСреднейЧисленности} (тип: ${typeof значениеСреднейЧисленности})`);
                        
                        // Преобразуем значение в число с плавающей точкой
                        if (typeof значениеСреднейЧисленности === 'string') {
                            средняяЧисленность = parseFloat(значениеСреднейЧисленности.replace(/\D/g, '')) || 0;
                        } else if (typeof значениеСреднейЧисленности === 'number') {
                            средняяЧисленность = значениеСреднейЧисленности;
                        } else {
                            средняяЧисленность = 0;
                        }
                        
                        console.log(`Преобразованное значение "Средняя численность работников" (число с плавающей точкой): ${средняяЧисленность}`);
                    } else {
                        console.log('Поле "Средняя численность работников" не найдено ни под одним из возможных имен, используем значение по умолчанию: 0');
                    }
                    
                    const суммаФот = row['Сумма по полю ФОТ'] ? 
                        parseFloat(row['Сумма по полю ФОТ']) : 0;
                    const суммаСрЗп = row['Сумма по полю ср.зп'] ? 
                        parseFloat(row['Сумма по полю ср.зп']) : 0;
                    const ипн = row['ИПН'] ? 
                        parseFloat(row['ИПН']) : 0;
                    const сн = row['СН'] ? 
                        parseFloat(row['СН']) : 0;
                    
                    // Подготавливаем значения для вставки
                    const values = [
                        uuidv4(),
                        row['Код ОКЭД'],
                        row['Вид деятельности'],
                        parseInt(row['Количество НП']) || 0,
                        средняяЧисленность,
                        суммаФот,
                        суммаСрЗп,
                        ипн,
                        сн,
                        parseFloat(row['Сумма налогов']) || 0,
                        удельныйВес
                    ];
                    
                    // Выводим значения для отладки
                    console.log('Подготовленные значения:');
                    console.log(`- Код ОКЭД: ${values[1]}`);
                    console.log(`- Вид деятельности: ${values[2]}`);
                    console.log(`- Количество НП: ${values[3]}`);
                    console.log(`- Средняя численность: ${values[4]}`);
                    console.log(`- Сумма ФОТ: ${values[5]}`);
                    console.log(`- Сумма ср.зп: ${values[6]}`);
                    console.log(`- ИПН: ${values[7]}`);
                    console.log(`- СН: ${values[8]}`);
                    console.log(`- Сумма налогов: ${values[9]}`);
                    console.log(`- Удельный вес: ${values[10]}`);
                    
                    // Вставляем данные в базу
                    await client.query(
                        `INSERT INTO "Сводная" (
                            id, "код_окэд", "вид_деятельности", "количество_нп",
                            "средняя_численность_работников", "Сумма_по_полю_ФОТт",
                            "Сумма_по_полю_ср.зп", "ипн", "сн", "сумма_налогов",
                            "удельный_вес", "createdAt", "updatedAt"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
                        values
                    );
                    
                    console.log('Запись успешно добавлена');
                    importedCount++;
                } else {
                    console.log('Запись уже существует, пропускаем');
                    skippedCount++;
                }
            }
            
            await client.query('COMMIT');
            console.log('\n=== Импорт данных завершен ===');
            console.log(`Всего записей в Excel: ${rawData.length}`);
            console.log(`Успешно импортировано: ${importedCount}`);
            console.log(`Пропущено: ${skippedCount}`);
            
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Ошибка при выполнении запроса:', err);
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка при импорте данных:', error);
        throw error;
    }
}

// Функция для импорта всех Excel файлов из папки
async function importAllExcelFiles() {
    const otchetyDir = path.join(__dirname, '..', 'otchety');
    
    if (!fs.existsSync(otchetyDir)) {
        console.log('Создаем директорию для отчетов...');
        fs.mkdirSync(otchetyDir, { recursive: true });
        console.log('Пожалуйста, поместите Excel файлы в директорию:', otchetyDir);
        return;
    }

    const files = fs.readdirSync(otchetyDir)
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

    if (files.length === 0) {
        console.log('Excel файлы не найдены в директории:', otchetyDir);
        return;
    }

    console.log(`Найдено ${files.length} Excel файлов`);
    
    for (const file of files) {
        const filePath = path.join(otchetyDir, file);
        console.log(`\nОбработка файла: ${file}`);
        try {
            await importFromExcel(filePath);
        } catch (error) {
            console.error(`Ошибка при обработке файла ${file}:`, error);
        }
    }
}

// Получаем путь к файлу из аргументов командной строки
const args = process.argv.slice(2);
let excelFilePath;

if (args.length > 0) {
    excelFilePath = args[0];
    importFromExcel(excelFilePath);
} else {
    importAllExcelFiles();
} 