const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport larger to capture full card
  await page.setViewport({ width: 1300, height: 1400 });
  
  const htmlPath = path.join(__dirname, 'pvara-linkedin.html');
  console.log('Loading:', htmlPath);
  
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  // Wait for animations to settle
  await new Promise(r => setTimeout(r, 1000));
  
  // Get the card element and screenshot just that
  const card = await page.$('.linkedin-card');
  
  // Take PNG screenshot of the card element
  await card.screenshot({ 
    path: path.join(__dirname, 'pvara-linkedin-post.png'),
    type: 'png'
  });
  console.log('✅ Saved: pvara-linkedin-post.png');
  
  // Take JPEG screenshot of the card element
  await card.screenshot({ 
    path: path.join(__dirname, 'pvara-linkedin-post.jpg'),
    type: 'jpeg',
    quality: 95
  });
  console.log('✅ Saved: pvara-linkedin-post.jpg');
  
  await browser.close();
  console.log('Done! Files saved to frontend/public/');
})();
