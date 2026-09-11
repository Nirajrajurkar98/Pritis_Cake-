const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Navigate to login
  await page.goto('http://localhost:8000/admin-login.html');
  
  // Login
  await page.type('#email', 'admin@priticake.local');
  await page.type('#password', 'admin123'); // assuming this is the password
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForNavigation();
  console.log('URL after login:', page.url());
  
  // Go to Cakes section
  await page.click('#link-cakes');
  await new Promise(r => setTimeout(r, 1000));
  console.log('Clicked Cakes section');
  
  // Click Add Cake
  const addBtn = await page.$x('//button[contains(text(), "+ Add Cake")]');
  if (addBtn.length > 0) {
    await addBtn[0].click();
    console.log('Clicked Add Cake modal button');
  } else {
    console.log('Add Cake button not found');
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Fill form
  await page.type('#cakeName', 'Test Cake Puppeteer');
  await page.type('#cakePrice', '999');
  await page.type('#cakeDesc', 'Test description');
  
  // Wait for save button
  console.log('Clicking Save Cake...');
  await page.click('#btnSaveCake');
  
  // Check what happens
  await new Promise(r => setTimeout(r, 2000));
  console.log('URL after save:', page.url());
  
  // Check active section
  const dashboardActive = await page.$eval('#sec-dashboard', el => el.classList.contains('active'));
  const cakesActive = await page.$eval('#sec-cakes', el => el.classList.contains('active'));
  console.log('Dashboard active:', dashboardActive);
  console.log('Cakes active:', cakesActive);
  
  await browser.close();
})();
