const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const process = require('process');
const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');


const EventEmitter = require('events');

const urlRegex = /(http(s)?:\/\/[^\s]+)/g;


class OzonParser extends EventEmitter {
    constructor(credentials, input, tableId, sheetName) {
        super();
        this.hostname = 'https://www.ozon.ru/';
        this.credentials = credentials;
        this.input = input;
        this.tableId = tableId;
        this.sheetName = sheetName;
    }
    
    getUrlsArray(urls) { 
        const result = [];
        
        try {
            for (const obj of urls) {
                for (const key in obj) {
                    if (urlRegex.test(key)) result.push(key);
                    if (urlRegex.test(urls[key])) result.push(urls[key]);
                }
            }
        } catch (e) {
            this.emit('error', e);
        }
    
        return result;
    }
    
    formatData(originalArray) { // special table format
        const products = originalArray.map(item => item[0]);
        const prices = originalArray.map(item => item[1]);
      
        const formattedArray = [];
        for (let i = 0; i < products.length; i += 3) {
          formattedArray.push(products.slice(i, i + 3));
          formattedArray.push(prices.slice(i, i + 3));
        }
      
        return formattedArray;
    }
      
    
    async loadToGoogleSheet(data) {
        const serviceAccountAuth = new JWT({
            email: this.credentials['client_email'],
            key: this.credentials['private_key'],
            scopes: [
              'https://www.googleapis.com/auth/spreadsheets',
            ],
        });
        
        const doc = new GoogleSpreadsheet(this.tableId, serviceAccountAuth);
        
        await doc.loadInfo();
    
        let sheet = doc.sheetsByTitle[this.sheetName];
        if (!sheet) sheet = await doc.addSheet({ title: this.sheetName }); // create sheet if not found
    
        await sheet.clear();
    
        await sheet.loadCells(`A1:C${data.length}`);
        for (let i = 0; i < data.length; i++) {
            let cellA = sheet.getCell(i, 0);
            let cellB = sheet.getCell(i, 1);
            let cellC = sheet.getCell(i, 2);
    
            cellA.value = data[i][0];
            cellB.value = data[i][1];
            cellC.value = data[i][2];
        }
        await sheet.saveUpdatedCells();
    
    }
    
    async parse(browser) {
        var result = [];
        var urls;

        urls = this.getUrlsArray(this.input);
    
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (req) => {
            if (req.resourceType() === 'image' || req.resourceType() === 'video') {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        for (let i = 0; i < urls.length; i++) {
            this.emit('output', `Parsing ${i + 1} of ${urls.length}. URL: ${urls[i]}`)

            await page.goto(urls[i]);

            try {
                await page.waitForSelector(':is(#reload-button, #__ozon)', {timeout: 1000 * 33});
            } catch (e) {
                this.emit('output', "Error: " + e + ". Skip URL: " + urls[i]);
            }
            
            const button = await page.$('#reload-button'); // escape warning
            if (button) {
                await button.click();
                await page.waitForSelector('#__ozon', {timeout: 1000 * 15});
            }

            let name = await page.$('h1');
            let [price] = await page.$x('//div/div[2]/div/div/span[contains(text(), "₽")][1]');
            if (price === undefined) [price] = await page.$x('//div/div[1]/div/div/span[contains(text(), "₽")][1]');
            if (name && price) {
                const nameText = await page.evaluate(el => el.textContent, name);
                const priceText = await page.evaluate(el => el.textContent, price);

                result.push([nameText, priceText]);
            } else {
                this.emit('output', "Skip URL: " + urls[i]);
            }
        }
    
        await browser.close();

        return result;
        
    
    }

    async start() {
        require('dotenv').config();
        puppeteer.use(StealthPlugin());
        puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], 
        defaultViewport: { width: 800, height: 600 },
        protocolTimeout: 1000 * 60 * 2,
        headless: (() => {
            if (process.env.HEADLESS === 'True') {
                return 'new';
            } else {
                return false;
            }
        })(), executablePath: executablePath() }).then(async browser => {
            this.emit('output', "=== START PARSING ===");
            var result = await this.parse(browser);
            this.emit('output', "=== END PARSING ===");

            result = this.formatData(result);

            this.emit('output', "=== LOAD RESULT ON GOOGLE SHEETS ===")
            try {
                this.loadToGoogleSheet(result);
                this.emit('output', "=== SUCCESS ===");
            } catch (err) {
                this.emit('output', "=== ERROR ===\n" + err);
            }

        });

    }
}


if (require.main === module) {
    const { readFile } = require('./utils');

    require('dotenv').config();

    let credentials = JSON.parse(readFile(process.env.CREDENTIALS_PATH));
    let input = JSON.parse(readFile(process.env.INPUT_PATH));
    let tableId = process.env.TABLE_ID;
    let sheetName = process.env.SHEET_NAME;

    const parser = new OzonParser(credentials, input, tableId, sheetName);

    parser.on('output', (output) => {
        console.log(output);
    });

    parser.start();
}

module.exports = OzonParser;
