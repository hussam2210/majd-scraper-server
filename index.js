const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// This is the main function that Vercel will run
module.exports = async (req, res) => {
  // We only want to accept POST requests
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

    // Go to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    // For now, we will just get the page title to prove it works.
    // Later, we will add the powerful scraping logic here.
    const pageTitle = await page.title();

    // Send a success response back to our app!
    res.status(200).send({
      message: 'Server successfully visited the page!',
      title: pageTitle,
      receivedUrl: url
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'An error occurred on the server.', error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
