/**
 * Playwright extraction script for thememdex100.com
 * Extracts all content, product data, images, and styling from the live Wix site.
 *
 * Usage: npx playwright test extract.js (or node with playwright dependency)
 *   Actually: node extract.js  (uses playwright directly)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://www.thememdex100.com';
const DATA_DIR = path.join(__dirname, 'data');
const PAGES_DIR = path.join(DATA_DIR, 'pages');
const ASSETS_DIR = path.join(__dirname, 'assets');
const PRODUCTS_DIR = path.join(ASSETS_DIR, 'products');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');

// Ensure directories exist
[DATA_DIR, PAGES_DIR, PRODUCTS_DIR, IMAGES_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Product slugs from sitemap
const PRODUCT_SLUGS = [
  'nearcon-2026-event-tee',
  'stylish-coffee-mug',
  'memdex-official-logo-dryblend-t-shirt',
  'automated-portfolio-nearcon-2026-tee',
  'memdex-embroidery-foam-trucker-hat',
  'official-logo-black-coffee-mug',
  'nearcon-2026-conference-t-shirt',
  'women-s-crop-hoodie',
  'memdex100-short-sleeve-unisex-t-shirt',
  'memdex-champion-pullover-hoodie',
  'memdex100-crew-neck-sweatshirt',
  'memdex-sport-tee',
  'memdex-9oz-scented-candle',
  'memdex100-samsung-phone-case',
  'memdex100-iphone-case',
  'memdex-bull-market-mug',
  'bull-market-stainless-steel-water-bottle',
  'memdex100-stainless-steel-water-bottle',
  'memdex-sports-water-bottle',
  'memdex-slides',
  'memdex-license-plate-frame',
  'memdex100-sneakers',
  'memdex-decal-stickers',
  'official-memdex-coffee-1',
  'memdex-logo-men-s-shorts',
  'automated-portfolio-shorts',
  'memdex-logo-champion-shorts',
  'memdex-logo-women-s-shorts',
  'memdex-athletic-shorts',
  'memdex-bull-run-shorts',
  'memdex100-dryblend-t-shirt-1',
];

// Content pages to extract
const CONTENT_PAGES = [
  { slug: '', name: 'home' },
  { slug: 'about-9', name: 'about' },
  { slug: 'gmm', name: 'gmm' },
  { slug: 'official-memdex-coffee', name: 'coffee' },
  { slug: 'english-terms-conditions', name: 'terms' },
  { slug: 'english-privacy-policy', name: 'privacy' },
  { slug: 'english-refund-policy', name: 'refund' },
  { slug: 'donation-thank-you-page', name: 'thank-you' },
  { slug: 'general-8', name: 'general-8' },
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) {
      return reject(new Error(`Invalid URL: ${url}`));
    }
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function waitForWixContent(page, timeout = 15000) {
  try {
    // Wait for Wix Thunderbolt to finish rendering
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Fallback: just wait a bit
    await page.waitForTimeout(5000);
  }
  // Extra wait for dynamic content
  await page.waitForTimeout(2000);
}

async function extractPageContent(page, url, name) {
  console.log(`\n📄 Extracting page: ${name} (${url})`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForWixContent(page);

    const data = await page.evaluate(() => {
      // Get all text content from main areas
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : '';
      };

      const getAllText = (selector) => {
        return Array.from(document.querySelectorAll(selector))
          .map(el => el.innerText.trim())
          .filter(t => t.length > 0);
      };

      // Get all images
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))
        .filter(img => img.src && !img.src.includes('data:'));

      // Get all background images from computed styles
      const bgImages = [];
      document.querySelectorAll('*').forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
          const match = bg.match(/url\(["']?([^"')]+)/);
          if (match) bgImages.push(match[1]);
        }
      });

      // Get all sections with their content
      const sections = [];
      document.querySelectorAll('section, [id*="comp-"]').forEach(section => {
        const headings = Array.from(section.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .map(h => ({ tag: h.tagName, text: h.innerText.trim() }));
        const paragraphs = Array.from(section.querySelectorAll('p, span'))
          .map(p => p.innerText.trim())
          .filter(t => t.length > 5);
        const links = Array.from(section.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }));
        const sectionImages = Array.from(section.querySelectorAll('img'))
          .map(img => img.src)
          .filter(src => src && !src.includes('data:'));

        if (headings.length > 0 || paragraphs.length > 0) {
          sections.push({
            id: section.id || '',
            headings,
            paragraphs,
            links,
            images: sectionImages,
          });
        }
      });

      // Get meta tags
      const meta = {};
      document.querySelectorAll('meta').forEach(m => {
        const name = m.getAttribute('name') || m.getAttribute('property');
        const content = m.getAttribute('content');
        if (name && content) meta[name] = content;
      });

      // Get page title
      const title = document.title;

      // Get navigation items
      const navItems = Array.from(document.querySelectorAll('nav a, [data-testid="linkElement"]'))
        .map(a => ({ href: a.href, text: a.innerText.trim() }))
        .filter(item => item.text.length > 0);

      // Get computed CSS variables from root
      const rootStyles = getComputedStyle(document.documentElement);
      const cssVars = {};
      // Try to get common Wix CSS variables
      for (let i = 0; i < 70; i++) {
        const val = rootStyles.getPropertyValue(`--color_${i}`);
        if (val) cssVars[`--color_${i}`] = val.trim();
      }

      // Get full body text
      const bodyText = document.body.innerText;

      return {
        title,
        meta,
        navItems,
        sections,
        images,
        bgImages: [...new Set(bgImages)],
        cssVars,
        bodyText,
      };
    });

    // Save page data
    const outputPath = path.join(PAGES_DIR, `${name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`  ✅ Saved ${data.sections.length} sections, ${data.images.length} images`);

    // Take a screenshot
    await page.screenshot({
      path: path.join(PAGES_DIR, `${name}.png`),
      fullPage: true,
    });
    console.log(`  📸 Screenshot saved`);

    return data;
  } catch (err) {
    console.error(`  ❌ Error extracting ${name}: ${err.message}`);
    return null;
  }
}

async function extractProduct(page, slug) {
  const url = `${BASE_URL}/product-page/${slug}`;
  console.log(`\n🛍️  Extracting product: ${slug}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForWixContent(page);

    const product = await page.evaluate((productSlug) => {
      // Try to find product name
      const nameEl = document.querySelector('[data-hook="product-title"], h1, [class*="product-name"], [class*="productName"]');
      const name = nameEl ? nameEl.innerText.trim() : '';

      // Try to find price
      const priceEl = document.querySelector('[data-hook="product-price"], [class*="price"], [data-hook="formatted-primary-price"]');
      const priceText = priceEl ? priceEl.innerText.trim() : '';

      // Try to find description
      const descEl = document.querySelector('[data-hook="product-description"], [class*="product-description"], [class*="productDescription"]');
      const description = descEl ? descEl.innerText.trim() : '';

      // Get all product images
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src && src.includes('wixstatic.com') && !src.includes('data:'))
        .map(src => {
          // Get the highest quality version
          const base = src.split('/v1/')[0];
          return base || src;
        });

      // Remove duplicates
      const uniqueImages = [...new Set(images)];

      // Try to find variants/options
      const options = [];
      document.querySelectorAll('[data-hook="product-options"] select, [data-hook="option-list"]').forEach(optGroup => {
        const label = optGroup.closest('[data-hook="product-options-item"]')?.querySelector('[data-hook="product-options-title"]')?.innerText?.trim() || '';
        const choices = Array.from(optGroup.querySelectorAll('option, [data-hook="option-list-item"]'))
          .map(opt => opt.innerText.trim())
          .filter(t => t && !t.includes('Select'));
        if (choices.length > 0) {
          options.push({ label, choices });
        }
      });

      // Try dropdown-based selectors
      document.querySelectorAll('select').forEach(select => {
        const choices = Array.from(select.options)
          .map(opt => opt.text.trim())
          .filter(t => t && !t.toLowerCase().includes('select'));
        if (choices.length > 0 && !options.some(o => JSON.stringify(o.choices) === JSON.stringify(choices))) {
          const label = select.closest('div')?.querySelector('label, span')?.innerText?.trim() || 'Option';
          options.push({ label, choices });
        }
      });

      // Try button-based selectors (color/size buttons)
      document.querySelectorAll('[data-hook="color-option"], [class*="colorOption"]').forEach(btn => {
        // Color options as buttons
      });

      // Get JSON-LD structured data
      let structuredData = null;
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'Product' || data.name) {
            structuredData = data;
          }
        } catch {}
      });

      // Get OG meta tags
      const ogData = {};
      document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
        ogData[meta.getAttribute('property')] = meta.getAttribute('content');
      });

      // Get full page text for fallback parsing
      const bodyText = document.body.innerText;

      return {
        slug: productSlug,
        name: name || ogData['og:title'] || structuredData?.name || '',
        description: description || ogData['og:description'] || structuredData?.description || '',
        price: priceText || (structuredData?.offers?.price ? `$${structuredData.offers.price}` : ''),
        currency: structuredData?.offers?.priceCurrency || 'USD',
        images: uniqueImages,
        options,
        structuredData,
        ogData,
        bodyText: bodyText.substring(0, 2000), // First 2000 chars for debugging
      };
    }, slug);

    console.log(`  Name: ${product.name || '(not found)'}`);
    console.log(`  Price: ${product.price || '(not found)'}`);
    console.log(`  Images: ${product.images.length}`);
    console.log(`  Options: ${product.options.length}`);

    return product;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return { slug, name: '', error: err.message };
  }
}

async function downloadProductImages(products) {
  console.log('\n📥 Downloading product images...');
  for (const product of products) {
    if (!product.images || product.images.length === 0) continue;

    const productDir = path.join(PRODUCTS_DIR, product.slug);
    fs.mkdirSync(productDir, { recursive: true });

    for (let i = 0; i < product.images.length; i++) {
      let imgUrl = product.images[i];
      // Ensure full URL
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      if (!imgUrl.startsWith('http')) continue;

      const ext = imgUrl.includes('.png') ? '.png' : '.jpg';
      const destPath = path.join(productDir, `image-${i}${ext}`);

      try {
        await downloadFile(imgUrl, destPath);
        console.log(`  ✅ ${product.slug}/image-${i}${ext}`);
      } catch (err) {
        console.log(`  ❌ Failed: ${product.slug}/image-${i}: ${err.message}`);
      }
    }
  }
}

async function downloadPageImages(pageData, pageName) {
  if (!pageData || !pageData.images) return;

  const pageImagesDir = path.join(IMAGES_DIR, pageName);
  fs.mkdirSync(pageImagesDir, { recursive: true });

  for (let i = 0; i < pageData.images.length; i++) {
    let imgUrl = pageData.images[i].src;
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    if (!imgUrl.startsWith('http')) continue;
    // Skip tiny images and icons
    if (pageData.images[i].width < 50 && pageData.images[i].height < 50) continue;

    const ext = imgUrl.includes('.png') ? '.png' :
                imgUrl.includes('.svg') ? '.svg' :
                imgUrl.includes('.webp') ? '.webp' : '.jpg';
    const destPath = path.join(pageImagesDir, `img-${i}${ext}`);

    try {
      await downloadFile(imgUrl, destPath);
    } catch (err) {
      // silently skip
    }
  }
}

async function main() {
  console.log('🚀 Starting Playwright extraction from thememdex100.com\n');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // ===== 1. Extract content pages =====
  console.log('\n📋 PHASE 1: Extracting content pages...');
  console.log('=' .repeat(60));

  const pageResults = {};
  for (const pg of CONTENT_PAGES) {
    const url = pg.slug ? `${BASE_URL}/${pg.slug}` : BASE_URL;
    const data = await extractPageContent(page, url, pg.name);
    if (data) {
      pageResults[pg.name] = data;
      // Download images from this page
      await downloadPageImages(data, pg.name);
    }
  }

  // Save CSS variables (design tokens) from home page
  if (pageResults.home && pageResults.home.cssVars) {
    const tokensPath = path.join(DATA_DIR, 'design-tokens.json');
    fs.writeFileSync(tokensPath, JSON.stringify(pageResults.home.cssVars, null, 2));
    console.log('\n🎨 Design tokens saved');
  }

  // ===== 2. Extract products =====
  console.log('\n\n🛒 PHASE 2: Extracting product catalog...');
  console.log('=' .repeat(60));

  const products = [];
  for (const slug of PRODUCT_SLUGS) {
    const product = await extractProduct(page, slug);
    products.push(product);
  }

  // Save products.json
  const productsPath = path.join(DATA_DIR, 'products.json');
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
  console.log(`\n✅ Saved ${products.length} products to products.json`);

  // ===== 3. Extract category data =====
  console.log('\n\n📂 PHASE 3: Extracting categories...');
  console.log('=' .repeat(60));

  const categories = [
    { slug: 't-shirts', name: 'T-Shirts' },
    { slug: 'sweatshirtshoodies', name: 'Sweatshirts & Hoodies' },
    { slug: 'hats', name: 'Hats' },
    { slug: 'footwear', name: 'Footwear' },
    { slug: 'shorts', name: 'Shorts' },
    { slug: 'accessories', name: 'Accessories' },
    { slug: 'coffee', name: 'Coffee' },
    { slug: 'mugstumblers', name: 'Mugs & Tumblers' },
    { slug: 'all-products', name: 'All Products' },
  ];

  for (const cat of categories) {
    console.log(`\n📂 Category: ${cat.name}`);
    try {
      await page.goto(`${BASE_URL}/category/${cat.slug}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await waitForWixContent(page);

      const catProducts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-hook="product-list-grid-item"], [class*="productItem"]'))
          .map(item => {
            const nameEl = item.querySelector('[data-hook="product-item-name"], a');
            const priceEl = item.querySelector('[data-hook="product-item-price"], [class*="price"]');
            const imgEl = item.querySelector('img');
            const linkEl = item.querySelector('a[href*="product-page"]');

            return {
              name: nameEl ? nameEl.innerText.trim() : '',
              price: priceEl ? priceEl.innerText.trim() : '',
              image: imgEl ? imgEl.src : '',
              link: linkEl ? linkEl.href : '',
            };
          })
          .filter(p => p.name);
      });

      console.log(`  Found ${catProducts.length} products`);

      // Map products to categories
      catProducts.forEach(cp => {
        const matching = products.find(p =>
          p.name && cp.name && p.name.toLowerCase() === cp.name.toLowerCase()
        );
        if (matching) {
          if (!matching.categories) matching.categories = [];
          matching.categories.push(cat.slug);
        }
      });
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // Re-save products with category assignments
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
  console.log('\n✅ Products updated with categories');

  // ===== 4. Download product images =====
  console.log('\n\n📸 PHASE 4: Downloading product images...');
  console.log('=' .repeat(60));
  await downloadProductImages(products);

  // ===== 5. Summary report =====
  console.log('\n\n' + '=' .repeat(60));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('=' .repeat(60));

  const successPages = Object.keys(pageResults).filter(k => pageResults[k]);
  const successProducts = products.filter(p => p.name && !p.error);
  const failedProducts = products.filter(p => !p.name || p.error);

  console.log(`\nPages extracted: ${successPages.length}/${CONTENT_PAGES.length}`);
  successPages.forEach(p => console.log(`  ✅ ${p}`));

  console.log(`\nProducts extracted: ${successProducts.length}/${PRODUCT_SLUGS.length}`);
  console.log(`  With names: ${successProducts.filter(p => p.name).length}`);
  console.log(`  With prices: ${successProducts.filter(p => p.price).length}`);
  console.log(`  With images: ${successProducts.filter(p => p.images?.length > 0).length}`);
  console.log(`  With options: ${successProducts.filter(p => p.options?.length > 0).length}`);

  if (failedProducts.length > 0) {
    console.log(`\n⚠️  Products needing manual extraction:`);
    failedProducts.forEach(p => console.log(`  - ${p.slug}: ${p.error || 'no data found'}`));
  }

  await browser.close();
  console.log('\n🏁 Extraction complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
