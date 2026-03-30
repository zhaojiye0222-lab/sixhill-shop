const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // mock local storage to skip login
  await page.goto('http://127.0.0.1:8088/frontend/admin.html');
  await page.evaluate(() => {
    localStorage.setItem('adminToken', 'fake-token');
    localStorage.setItem('adminUser', JSON.stringify({role: 'admin', username: 'admin'}));
  });
  
  // Reload to apply localstorage
  await page.goto('http://127.0.0.1:8088/frontend/admin.html');
  await new Promise(r => setTimeout(r, 1000));
  
  // Check what is visible
  const html = await page.content();
  console.log('Includes Dashboard:', html.includes('Sixhill'));
  
  try {
    console.log('Active Tab:', await page.evaluate(() => document.querySelector('.capitalize').textContent));
  } catch (e) {
    console.log('No .capitalize found', e.message);
  }
  
  // try clicking orders
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const ordersLink = links.find(l => l.textContent.includes('Orders'));
    if (ordersLink) ordersLink.click();
  });
  
  await new Promise(r => setTimeout(r, 500));
  try {
    console.log('Active Tab after click:', await page.evaluate(() => document.querySelector('.capitalize').textContent));
  } catch (e) {}

  await browser.close();
})();
