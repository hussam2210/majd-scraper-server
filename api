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

        // --- Domain-Specific Selectors ---
        const domain = window.location.hostname;
        let nameSelectors, priceSelectors, imageSelectors;

        if (domain.includes('amazon')) {
            nameSelectors = ['#productTitle'];
            // Amazon often hides the real price in a visually hidden span for screen readers
            priceSelectors = ['.a-price[data-a-color="price"] .a-offscreen', '.priceToPay .a-offscreen'];
            imageSelectors = ['#landingImage', '#imgTagWrapperId img'];
        } else {
            // Generic fallback for other stores
            nameSelectors = ['h1', '.product-title', '.pr-in-nm'];
            priceSelectors = ['.price', '.Price-amount', '.prc-slg'];
            imageSelectors = ['img[data-main-image]', '.gallery-container img'];
        }

        return {
            name: query(nameSelectors),
            price: query(priceSelectors),
            imageUrl: queryImage(imageSelectors),
            availableSizes: [], // Placeholder for future enhancement
            availableColors: []  // Placeholder for future enhancement
        };
    });

    // If we couldn't find a name or a price, it's probably not a product page.
    if (!productData.name || !productData.price) {
        return res.status(404).send({ message: 'Could not automatically determine product details.' });
    }

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
