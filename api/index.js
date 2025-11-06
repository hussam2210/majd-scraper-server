const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// This is the main function that Vercel will run
module.exports = async (req, res) => {
  // We only want to accept POST requests, which have a body
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests are allowed.' });
  }

  // Get the url from the request body that our app will send
  const { url } = req.body;

  if (!url) {
    return res.status(400).send({ message: 'URL is required.' });
  }

  let browser = null;
  try {
    // Launch the headless browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    // Set a realistic user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
    
    // Go to the URL with a longer timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // The new, more intelligent scraping logic
    const productData = await page.evaluate(() => {
        const query = (selectors) => {
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return element.innerText.trim();
            }
            return null; // Return null if not found
        };

        const queryImage = (selectors) => {
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return element.src;
            }
            return null; // Return null if not found
        };

        // --- Domain-Specific Selectors ---
        const domain = window.location.hostname;
        let nameSelectors, priceSelectors, imageSelectors;

        // Use more specific selectors for Amazon
        if (domain.includes('amazon')) {
            nameSelectors = ['#productTitle'];
            priceSelectors = ['.a-price[data-a-color="price"] .a-offscreen', '.priceToPay .a-offscreen', '#corePrice_feature_div .a-offscreen'];
            imageSelectors = ['#landingImage', '#imgTagWrapperId img'];
        } else if (domain.includes('trendyol')) {
            nameSelectors = ['.pr-in-nm'];
            priceSelectors = ['.pr-prc-slg'];
            imageSelectors = ['.gallery-container .p-card-img'];
        } else {
            // Generic fallback for other stores
            nameSelectors = ['h1', '.product-title'];
            priceSelectors = ['.price', '.Price-amount'];
            imageSelectors = ['img[data-main-image]', '.product-image-container img'];
        }

        return {
            name: query(nameSelectors),
            price: query(priceSelectors),
            imageUrl: queryImage(imageSelectors),
            availableSizes: [], // Placeholder for future enhancement
            availableColors: []  // Placeholder for future enhancement
        };
    });

    // If we couldn't find a name or a price, it's likely not a valid product page.
    if (!productData.name || !productData.price) {
        return res.status(404).send({ message: 'Could not automatically determine product details from the page.' });
    }

    // Send the rich, structured data back to our app!
    res.status(200).send(productData);

  } catch (error) {
    console.error(error); // Log the full error to Vercel logs
    res.status(500).send({ message: 'An error occurred on the server while scraping.', error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
