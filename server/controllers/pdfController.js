const PDFDocument = require('pdfkit');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Подключение к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bdbdsm',
  password: 'admin',
  port: 5432,
});

/**
 * Генерирует PDF файл из данных таблицы Сводная
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
exports.generatePdf = async (req, res) => {
  try {
    console.log('Начало генерации PDF отчета...');
    
    // Получаем данные из базы данных
    const query = req.query.filter 
      ? `SELECT * FROM "Сводная" WHERE код_окэд ILIKE $1 OR вид_деятельности ILIKE $1 ORDER BY код_окэд`
      : 'SELECT * FROM "Сводная" ORDER BY код_окэд';
    
    const queryParams = req.query.filter ? [`%${req.query.filter}%`] : [];
    console.log('Выполняем SQL запрос:', query);
    console.log('Параметры:', queryParams);
    
    const result = await req.app.get('db').query(query, queryParams);
    console.log(`Получено ${result.rows.length} записей из базы данных`);
    
    // Создаем PDF документ
    console.log('Создаем PDF документ...');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Отчет по данным "Сводная"',
        Author: 'BDSM API',
        Subject: 'Статистические данные',
      }
    });

    // Используем встроенный шрифт PDFKit
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);

    // Настраиваем шрифты и стили
    const titleSize = 16;
    const headerSize = 12;
    const textSize = 10;
    const lineGap = 5;
    
    // Добавляем заголовок
    doc.fontSize(titleSize).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(textSize).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(textSize).text(`Применен фильтр: "${req.query.filter}"`, {
        align: 'left',
        italics: true
      });
      doc.moveDown();
    }

    // Проверяем, есть ли данные
    if (result.rows.length === 0) {
      doc.fontSize(textSize).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(textSize).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Определяем ширину столбцов таблицы
      const tableWidth = 500;
      const colWidths = {
        код_окэд: 70,
        вид_деятельности: 180,
        количество_нп: 60,
        средняя_численность_работников: 60,
        Сумма_по_полю_ФОТт: 65,
        Сумма_по_полю_ср_зп: 65
      };

      let y = doc.y;

      // Рисуем заголовки таблицы
      doc.fontSize(headerSize).text('Код ОКЭД', 50, y, { width: colWidths.код_окэд });
      doc.text('Вид деятельности', 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      doc.text('Кол-во', 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text('Числ.', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text('ФОТ', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text('Ср. ЗП', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 20;
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
      y += 5;

      // Форматирование чисел с разделителями
      const formatNumber = (num) => {
        return new Intl.NumberFormat('ru-RU').format(num);
      };

      // Рисуем данные таблицы
      let rowIndex = 0;
      for (const row of result.rows) {
        // Ограничиваем количество строк на страницу
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(textSize);
        doc.text(row.код_окэд, 50, y, { width: colWidths.код_окэд });
        
        // Обрезаем длинные названия
        let деятельность = row.вид_деятельности;
        if (деятельность.length > 45) {
          деятельность = деятельность.substring(0, 45) + '...';
        }
        doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
        
        doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
        doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

        y += 15;

        // Добавляем разделитель между строками через одну
        rowIndex++;
        if (rowIndex % 2 === 0) {
          doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
        }
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    }

    // Добавляем номера страниц
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Генерирует PDF с детальной информацией по одной записи
 * @param {Object} req - HTTP запрос с параметром id
 * @param {Object} res - HTTP ответ
 */
exports.generateDetailPdf = async (req, res) => {
  try {
    console.log('Начало генерации детального PDF отчета...');
    const { id } = req.params;
    console.log('ID записи:', id);
    
    // Получаем данные конкретной записи
    console.log('Выполняем запрос к базе данных...');
    const result = await pool.query('SELECT * FROM "Сводная" WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      console.log('Запись не найдена');
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    
    console.log('Запись найдена, начинаем генерацию PDF');
    const data = result.rows[0];
    
    // Создаем PDF документ с поддержкой кириллицы
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Детальный отчет: ${data.вид_деятельности}`,
        Author: 'BDSM API',
        Subject: 'Детальные данные',
      }
    });

    // Регистрируем шрифт с поддержкой кириллицы
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=detail-report-${data.код_окэд.replace(/[\/\\]/g, '-')}-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);
    
    // Оформление заголовка
    doc.fontSize(16).text(`Детальная информация: ${data.вид_деятельности}`, {
      align: 'center',
      underline: true
    });
    doc.moveDown();
    
    // Дата создания
    const now = new Date();
    doc.fontSize(10).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown(2);
    
    // Информация о записи в виде таблицы
    const labelWidth = 200;
    const valueWidth = 300;
    const startX = 70;
    let y = doc.y;
    
    // Форматирование чисел с разделителями
    const formatNumber = (num) => {
      return new Intl.NumberFormat('ru-RU').format(num);
    };
    
    // Функция для добавления строки таблицы
    const addTableRow = (label, value, format = null) => {
      doc.fontSize(11).text(label, startX, y, { width: labelWidth, continued: false });
      const displayValue = format ? format(value) : value;
      doc.text(displayValue, startX + labelWidth, y, { width: valueWidth });
      y += 20;
    };
    
    // Добавляем данные
    addTableRow('Код ОКЭД:', data.код_окэд);
    addTableRow('Вид деятельности:', data.вид_деятельности);
    addTableRow('Количество НП:', data.количество_нп, formatNumber);
    addTableRow('Средняя численность работников:', data.средняя_численность_работников, formatNumber);
    addTableRow('Сумма по полю ФОТ:', data.Сумма_по_полю_ФОТт, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Средняя зарплата:', data.Сумма_по_полю_ср_зп, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Сумма налогов:', data.сумма_налогов, (val) => formatNumber(Math.round(val)) + ' тг.');
    addTableRow('Удельный вес:', data.удельный_вес, (val) => val + '%');
    addTableRow('Дата создания записи:', new Date(data.createdAt).toLocaleString());
    addTableRow('Дата обновления записи:', new Date(data.updatedAt).toLocaleString());
    
    // Добавляем разделительную линию
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;
    
    // Добавляем примечание
    doc.fontSize(10).text('Примечание: Вся информация предоставлена из базы данных BDSM. Все данные актуальны на момент создания отчета.', 50, y, {
      align: 'left',
      width: 500
    });
    
    // Добавляем номер страницы
    doc.fontSize(8).text(
      'Страница 1 из 1',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
    
    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации детального PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Генерирует PDF с информацией по нескольким выбранным записям
 * @param {Object} req - HTTP запрос с массивом идентификаторов в req.body.ids
 * @param {Object} res - HTTP ответ
 */
exports.generateMultipleDetailPdf = async (req, res) => {
  try {
    console.log('Начало генерации PDF для нескольких записей...');
    const { ids } = req.body;
    console.log('Полученные ID:', ids);
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('Ошибка: массив ID не предоставлен или пуст');
      return res.status(400).json({ message: 'Необходимо предоставить массив идентификаторов записей' });
    }
    
    // Получаем данные выбранных записей
    console.log('Выполняем запрос к базе данных...');
    const result = await pool.query('SELECT * FROM "Сводная" WHERE id = ANY($1) ORDER BY код_окэд', [ids]);
    
    if (result.rows.length === 0) {
      console.log('Записи не найдены');
      return res.status(404).json({ message: 'Записи не найдены' });
    }
    
    console.log(`Найдено ${result.rows.length} записей, начинаем генерацию PDF`);
    
    // Создаем PDF документ с поддержкой кириллицы
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Отчет по выбранным записям (${result.rows.length})`,
        Author: 'BDSM API',
        Subject: 'Детальные данные по выбранным записям',
      }
    });

    // Регистрируем шрифт с поддержкой кириллицы
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=multi-report-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);
    
    // Оформление заголовка
    doc.fontSize(16).text(`Отчет по выбранным записям (${result.rows.length})`, {
      align: 'center',
      underline: true
    });
    doc.moveDown();
    
    // Дата создания
    const now = new Date();
    doc.fontSize(10).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown(2);
    
    // Форматирование чисел с разделителями
    const formatNumber = (num) => {
      return new Intl.NumberFormat('ru-RU').format(num);
    };
    
    // Определяем ширину столбцов таблицы
    const tableWidth = 500;
    const colWidths = {
      код_окэд: 70,
      вид_деятельности: 180,
      количество_нп: 60,
      средняя_численность_работников: 60,
      Сумма_по_полю_ФОТт: 65,
      Сумма_по_полю_ср_зп: 65
    };

    let y = doc.y;

    // Рисуем заголовки таблицы
    doc.fontSize(12).text('Код ОКЭД', 50, y, { width: colWidths.код_окэд });
    doc.text('Вид деятельности', 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
    doc.text('Кол-во', 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
    doc.text('Числ.', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
    doc.text('ФОТ', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
    doc.text('Ср. ЗП', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

    y += 20;
    doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
    y += 5;

    // Рисуем данные таблицы
    let rowIndex = 0;
    for (const row of result.rows) {
      // Ограничиваем количество строк на страницу
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }

      doc.fontSize(10);
      doc.text(row.код_окэд, 50, y, { width: colWidths.код_окэд });
      
      // Обрезаем длинные названия
      let деятельность = row.вид_деятельности;
      if (деятельность.length > 45) {
        деятельность = деятельность.substring(0, 45) + '...';
      }
      doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      
      doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 15;

      // Добавляем разделитель между строками через одну
      rowIndex++;
      if (rowIndex % 2 === 0) {
        doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
      }
    }

    // Добавляем нижнюю линию таблицы
    doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    y += 15;
    
    // Добавляем статистическую сводку
    doc.fontSize(12).text('Сводная информация по выбранным записям:', 50, y, { underline: true });
    y += 20;
    
    // Вычисляем суммарные показатели
    const totalNp = result.rows.reduce((sum, row) => sum + row.количество_нп, 0);
    const totalEmployees = result.rows.reduce((sum, row) => sum + row.средняя_численность_работников, 0);
    const totalFund = result.rows.reduce((sum, row) => sum + row.Сумма_по_полю_ФОТт, 0);
    const avgSalary = totalEmployees > 0 ? totalFund / totalEmployees : 0;
    const totalTax = result.rows.reduce((sum, row) => sum + row.сумма_налогов, 0);
    
    // Выводим статистику
    doc.fontSize(10);
    doc.text(`Общее количество НП: ${formatNumber(totalNp)}`, 50, y);
    y += 15;
    doc.text(`Общая численность работников: ${formatNumber(totalEmployees)}`, 50, y);
    y += 15;
    doc.text(`Общий фонд оплаты труда: ${formatNumber(Math.round(totalFund))} тг.`, 50, y);
    y += 15;
    doc.text(`Средняя заработная плата: ${formatNumber(Math.round(avgSalary))} тг.`, 50, y);
    y += 15;
    doc.text(`Общая сумма налогов: ${formatNumber(Math.round(totalTax))} тг.`, 50, y);
    
    // Добавляем номера страниц
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }
    
    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF для нескольких записей:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

exports.generatePdfById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Запрос на генерацию PDF для записи с ID: ${id}`);
    
    // Получаем данные из базы данных
    const result = await req.app.get('db').query('SELECT * FROM "Сводная" WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    
    console.log('Запись найдена, начинаем генерацию PDF');
    const data = result.rows[0];
    
    // Создаем PDF документ
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Отчет по записи ${data.код_окэд}`,
        Author: 'BDSM API',
        Subject: 'Статистические данные',
      }
    });

    // Используем встроенный шрифт PDFKit
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${data.код_окэд}-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);

    // Настраиваем шрифты и стили
    const titleSize = 16;
    const headerSize = 12;
    const textSize = 10;
    const lineGap = 5;
    
    // Добавляем заголовок
    doc.fontSize(titleSize).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(textSize).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(textSize).text(`Применен фильтр: "${req.query.filter}"`, {
        align: 'left',
        italics: true
      });
      doc.moveDown();
    }

    // Проверяем, есть ли данные
    if (result.rows.length === 0) {
      doc.fontSize(textSize).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(textSize).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Определяем ширину столбцов таблицы
      const tableWidth = 500;
      const colWidths = {
        код_окэд: 70,
        вид_деятельности: 180,
        количество_нп: 60,
        средняя_численность_работников: 60,
        Сумма_по_полю_ФОТт: 65,
        Сумма_по_полю_ср_зп: 65
      };

      let y = doc.y;

      // Рисуем заголовки таблицы
      doc.fontSize(headerSize).text('Код ОКЭД', 50, y, { width: colWidths.код_окэд });
      doc.text('Вид деятельности', 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      doc.text('Кол-во', 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text('Числ.', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text('ФОТ', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text('Ср. ЗП', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 20;
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
      y += 5;

      // Форматирование чисел с разделителями
      const formatNumber = (num) => {
        return new Intl.NumberFormat('ru-RU').format(num);
      };

      // Рисуем данные таблицы
      let rowIndex = 0;
      for (const row of result.rows) {
        // Ограничиваем количество строк на страницу
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(textSize);
        doc.text(row.код_окэд, 50, y, { width: colWidths.код_окэд });
        
        // Обрезаем длинные названия
        let деятельность = row.вид_деятельности;
        if (деятельность.length > 45) {
          деятельность = деятельность.substring(0, 45) + '...';
        }
        doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
        
        doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
        doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

        y += 15;

        // Добавляем разделитель между строками через одну
        rowIndex++;
        if (rowIndex % 2 === 0) {
          doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
        }
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    }

    // Добавляем номера страниц
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
};

exports.generatePdfByOked = async (req, res) => {
  try {
    const { oked } = req.params;
    console.log(`Запрос на генерацию PDF для ОКЭД: ${oked}`);
    
    // Получаем данные из базы данных
    const result = await req.app.get('db').query('SELECT * FROM "Сводная" WHERE код_окэд = $1', [oked]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Записи не найдены' });
    }
    
    console.log(`Найдено ${result.rows.length} записей, начинаем генерацию PDF`);
    
    // Создаем PDF документ
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Отчет по ОКЭД ${oked}`,
        Author: 'BDSM API',
        Subject: 'Статистические данные',
      }
    });

    // Используем встроенный шрифт PDFKit
    doc.font('Helvetica');

    // Настраиваем заголовки для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${oked}-${Date.now()}.pdf`);

    // Направляем PDF прямо в response
    doc.pipe(res);

    // Настраиваем шрифты и стили
    const titleSize = 16;
    const headerSize = 12;
    const textSize = 10;
    const lineGap = 5;
    
    // Добавляем заголовок
    doc.fontSize(titleSize).text('Отчет по данным "Сводная"', {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // Добавляем дату создания
    const now = new Date();
    doc.fontSize(textSize).text(`Дата создания: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, {
      align: 'right'
    });
    doc.moveDown();

    // Добавляем примененные фильтры
    if (req.query.filter) {
      doc.fontSize(textSize).text(`Применен фильтр: "${req.query.filter}"`, {
        align: 'left',
        italics: true
      });
      doc.moveDown();
    }

    // Проверяем, есть ли данные
    if (result.rows.length === 0) {
      doc.fontSize(textSize).text('Нет данных для отображения.', {
        align: 'center'
      });
    } else {
      // Добавляем информацию о количестве записей
      doc.fontSize(textSize).text(`Всего записей: ${result.rows.length}`, {
        align: 'left'
      });
      doc.moveDown();

      // Определяем ширину столбцов таблицы
      const tableWidth = 500;
      const colWidths = {
        код_окэд: 70,
        вид_деятельности: 180,
        количество_нп: 60,
        средняя_численность_работников: 60,
        Сумма_по_полю_ФОТт: 65,
        Сумма_по_полю_ср_зп: 65
      };

      let y = doc.y;

      // Рисуем заголовки таблицы
      doc.fontSize(headerSize).text('Код ОКЭД', 50, y, { width: colWidths.код_окэд });
      doc.text('Вид деятельности', 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
      doc.text('Кол-во', 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
      doc.text('Числ.', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
      doc.text('ФОТ', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
      doc.text('Ср. ЗП', 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

      y += 20;
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
      y += 5;

      // Форматирование чисел с разделителями
      const formatNumber = (num) => {
        return new Intl.NumberFormat('ru-RU').format(num);
      };

      // Рисуем данные таблицы
      let rowIndex = 0;
      for (const row of result.rows) {
        // Ограничиваем количество строк на страницу
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(textSize);
        doc.text(row.код_окэд, 50, y, { width: colWidths.код_окэд });
        
        // Обрезаем длинные названия
        let деятельность = row.вид_деятельности;
        if (деятельность.length > 45) {
          деятельность = деятельность.substring(0, 45) + '...';
        }
        doc.text(деятельность, 50 + colWidths.код_окэд, y, { width: colWidths.вид_деятельности });
        
        doc.text(formatNumber(row.количество_нп), 50 + colWidths.код_окэд + colWidths.вид_деятельности, y, { width: colWidths.количество_нп });
        doc.text(formatNumber(row.средняя_численность_работников), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп, y, { width: colWidths.средняя_численность_работников });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ФОТт)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников, y, { width: colWidths.Сумма_по_полю_ФОТт });
        doc.text(formatNumber(Math.round(row.Сумма_по_полю_ср_зп)), 50 + colWidths.код_окэд + colWidths.вид_деятельности + colWidths.количество_нп + colWidths.средняя_численность_работников + colWidths.Сумма_по_полю_ФОТт, y, { width: colWidths.Сумма_по_полю_ср_зп });

        y += 15;

        // Добавляем разделитель между строками через одну
        rowIndex++;
        if (rowIndex % 2 === 0) {
          doc.moveTo(50, y - 5).lineTo(50 + tableWidth, y - 5).lineWidth(0.5).stroke();
        }
      }

      // Добавляем нижнюю линию таблицы
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).stroke();
    }

    // Добавляем номера страниц
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Страница ${i + 1} из ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Завершаем документ
    doc.end();
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    console.error('Стек вызовов:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при генерации PDF', 
      error: error.message,
      stack: error.stack
    });
  }
}; 