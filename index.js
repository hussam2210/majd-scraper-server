const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// This is the main function that Vercel will run
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests are allowed.' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).send({ message: 'URL is required.' });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    // Set a user agent to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    // The new, more intelligent scraping logic
    const productData = await page.evaluate(() => {
        const query = (selectors) => {
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return element.innerText.trim();
            }
            return '';
        };

        const queryImage = (selectors) => {
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return element.src;
            }
            return '';
        };

        const titleSelectors = ['h1', '#productTitle', '.product-title', '.pr-in-nm'];
        const priceSelectors = ['.price', '.a-price-whole', '.prc-slg', '.Price-amount'];
        const imageSelectors = ['img[data-main-image]', '#landingImage', '.gallery-container img', '.product-image-container img'];

        return {
            name: query(titleSelectors),
            price: query(priceSelectors),
            imageUrl: queryImage(imageSelectors),
            availableSizes: [], // We can add selectors for these later
            availableColors: []
        };
    });

    // Send the rich, structured data back to our app!
    res.status(200).send(productData);

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'An error occurred on the server.', error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
