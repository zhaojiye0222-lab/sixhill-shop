const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Route to the local server
  await page.goto('http://127.0.0.1:8081');

  // Wait for Vue to load
  await page.waitForSelector('#app');

  // Click profile tab
  await page.evaluate(() => {
    const profileTab = Array.from(document.querySelectorAll('nav div')).find(el => el.textContent.includes('Profile'));
    if (profileTab) profileTab.click();
  });

  await page.waitForTimeout(1000);

  // Click login
  await page.evaluate(() => {
    const loginBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Login'));
    if (loginBtn) loginBtn.click();
  });

  await page.waitForTimeout(1000);

  // Click view history
  await page.evaluate(() => {
    const historyBtn = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('View History'));
    if (historyBtn) historyBtn.click();
  });

  await page.waitForTimeout(1000);

  // Inject click tracker
  await page.evaluate(() => {
    window.lastClicked = null;
    document.addEventListener('click', (e) => {
      window.lastClicked = e.target.outerHTML;
      console.log('CLICKED:', e.target.outerHTML);
    }, true);
  });

  page.on('console', msg => console.log('BROWSER:', msg.text()));

  // Try to click Pay Now
  const payNowClicked = await page.evaluate(() => {
    const payNowBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Pay Now'));
    if (payNowBtn) {
      payNowBtn.click();
      return true;
    }
    return false;
  });

  console.log('Pay Now button found and clicked:', payNowClicked);
  await page.waitForTimeout(500);

  const modalVisible = await page.evaluate(() => {
    return document.body.innerHTML.includes('Confirm Payment');
  });

  console.log('Modal visible after clicking Pay Now:', modalVisible);

  await browser.close();
})();
