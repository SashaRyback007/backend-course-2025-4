const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();
program.requiredOption('-i, --input <path>').requiredOption('-h, --host <host>').requiredOption('-p, --port <port>');
program.parse(process.argv);
const opts = program.opts();

http.createServer(async (req, res) => {
    try {
        const rawData = await fs.readFile(opts.input, 'utf8');
        const data = JSON.parse(rawData);
        
        // Фільтрація (Варіант 1)
        const filtered = data
            .filter(m => m.COD_STATE === 1)
            .map(m => ({
                MFO: m.MFO,
                NAME: m.NAME,
                COD_STATE: m.COD_STATE
            }));
            
        const builder = new XMLBuilder({ format: true });
        
        // Обгортаємо результат у тег <data>, а кожен запис у <manager>
        const xml = builder.build({ 
            data: { 
                manager: filtered 
            } 
        });
        
        res.writeHead(200, {'Content-Type': 'application/xml; charset=utf-8'});
        res.end(xml);
    } catch (e) {
        res.writeHead(500);
        res.end("Error");
    }
}).listen(opts.port, opts.host, () => console.log(`Server ok on port ${opts.port}`));