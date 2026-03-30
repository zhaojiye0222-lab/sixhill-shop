const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, '\n', error.stack));
  
  await page.goto('http://127.0.0.1:8081');
  
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
