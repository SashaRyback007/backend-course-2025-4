const http = require('http');
const fs = require('fs').promises;
const { program } = require('commander');
const { XMLBuilder } = require('fast-xml-parser');

// 1. Налаштування аргументів командного рядка
program
  .requiredOption('-i, --input <path>', 'шлях до файлу з даними')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .parse(process.argv);

const { input, host, port } = program.opts();

// 2. Створення сервера
const server = http.createServer(async (req, res) => {
  try {
    // Перевірка наявності файлу
    await fs.access(input);

    // Асинхронне читання JSON
    const data = await fs.readFile(input, 'utf8');
    let banks = JSON.parse(data);

    // Робота з параметрами URL (query string)
    const url = new URL(req.url, `http://${host}:${port}`);
    const showOnlyNormal = url.searchParams.get('normal') === 'true';
    const showMfo = url.searchParams.get('mfo') === 'true';

    // Логіка фільтрації за Варіантом 1
    if (showOnlyNormal) {
      banks = banks.filter(bank => bank.COD_STATE === 1);
    }

   // Формування масиву для XML (БЕЗ додаткового вкладення { bank: entry })
    const result = banks.map(bank => {
      const entry = {};
      if (showMfo) entry.MFO = bank.MFO;
      entry.NAME = bank.NAME;
      entry.COD_STATE = bank.COD_STATE;
      return entry; // Повертаємо чистий об'єкт з даними
    });

    // Конвертація в XML
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
    
    // Тепер структура буде: <banks> -> багато <bank> -> дані кожного банку
    const xmlContent = builder.build({
      banks: {
        bank: result 
      }
    });

    // Відповідь сервера
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(xmlContent);

  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Cannot find input file');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  }
});

// 3. Запуск сервера
server.listen(port, host, () => {
  console.log('Сервер запущено на http://' + host + ':' + port)
});