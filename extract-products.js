/**
 * Improved product extraction script for thememdex100.com
 *
 * The original extract.js used sitemap product slugs, but those URLs return
 * "This product couldn't be found". This script instead:
 * 1. Navigates to /category/all-products (the actual Merch page)
 * 2. Extracts product cards from the grid
 * 3. Visits each product's actual link for full details
 * 4. Downloads product images
 *
 * Usage: node extract-products.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://www.thememdex100.com';
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_DIR = path.join(__dirname, 'assets', 'products');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

// Category pages to check
const CATEGORY_URLS = [
  { name: 'All Products', url: `${BASE_URL}/category/all-products` },
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return reject(new Error(`Invalid URL: ${url}`));
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

async function scrollToBottom(page) {
  // Scroll down slowly to trigger lazy-loading
  let prevHeight = 0;
  for (let i = 0; i < 20; i++) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (height === prevHeight) break;
    prevHeight = height;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
  }
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function extractProductsFromCategoryPage(page, url, categoryName) {
  console.log(`\n📂 Extracting category: ${categoryName} (${url})`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for the store gallery to appear - try multiple selectors
  const storeSelectors = [
    '[data-hook="product-list-wrapper"]',
    '[data-hook="product-list"]',
    '.gallery-item-container',
    '[class*="ProductItem"]',
    '[class*="product-item"]',
    '[data-hook="gallery-item-image-container"]',
    'li[data-hook]',
    '.grid-item',
  ];

  let foundSelector = null;
  for (const sel of storeSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      foundSelector = sel;
      console.log(`  ✓ Found products with selector: ${sel}`);
      break;
    } catch {}
  }

  if (!foundSelector) {
    console.log('  ⏳ No quick selector found, waiting longer for page render...');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(8000);
  }

  // Take screenshot for debugging
  await page.screenshot({
    path: path.join(DATA_DIR, `category-${categoryName.toLowerCase().replace(/\s+/g, '-')}.png`),
    fullPage: true
  });
  console.log(`  📸 Category screenshot saved`);

  // Scroll to load all products
  await scrollToBottom(page);
  await page.waitForTimeout(2000);

  // Extract product cards from the grid
  const products = await page.evaluate(() => {
    const results = [];

    // Strategy 1: Wix store product items with data-hooks
    const productItems = document.querySelectorAll(
      '[data-hook="product-list-grid-item"], ' +
      'li[data-hook*="product"], ' +
      '[data-hook="gallery-item-container"]'
    );

    if (productItems.length > 0) {
      productItems.forEach(item => {
        const nameEl = item.querySelector(
          '[data-hook="product-item-name"], ' +
          '[data-hook="product-title"], ' +
          'h3, h2, [class*="productName"], [class*="product-name"]'
        );
        const priceEl = item.querySelector(
          '[data-hook="product-item-price-to-pay"], ' +
          '[data-hook="product-price"], ' +
          '[class*="price"]'
        );
        const linkEl = item.querySelector('a[href*="product-page"]');
        const imgEl = item.querySelector('img');

        if (nameEl || linkEl) {
          results.push({
            name: nameEl ? nameEl.innerText.trim() : '',
            price: priceEl ? priceEl.innerText.trim() : '',
            url: linkEl ? linkEl.href : '',
            image: imgEl ? imgEl.src : '',
            imageAlt: imgEl ? imgEl.alt : '',
          });
        }
      });
    }

    // Strategy 2: Look for any links to product pages
    if (results.length === 0) {
      const allLinks = document.querySelectorAll('a[href*="product-page"]');
      const seen = new Set();
      allLinks.forEach(link => {
        const href = link.href;
        if (seen.has(href)) return;
        seen.add(href);

        // Find closest product container
        const container = link.closest('li, article, [class*="product"], [class*="gallery-item"]') || link;
        const nameEl = container.querySelector('h2, h3, h4, [data-hook="product-item-name"]');
        const priceEl = container.querySelector('[data-hook*="price"], [class*="price"]');
        const imgEl = container.querySelector('img');

        results.push({
          name: nameEl ? nameEl.innerText.trim() : (link.innerText.trim() || ''),
          price: priceEl ? priceEl.innerText.trim() : '',
          url: href,
          image: imgEl ? imgEl.src : '',
          imageAlt: imgEl ? imgEl.alt : '',
        });
      });
    }

    // Strategy 3: Check for Wix app JSON data in script tags
    if (results.length === 0) {
      const scripts = document.querySelectorAll('script[type="application/json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          const json = JSON.stringify(data);
          if (json.includes('product') && json.includes('price')) {
            // Try to find product arrays in the data
            const findProducts = (obj, depth = 0) => {
              if (depth > 10) return;
              if (Array.isArray(obj)) {
                for (const item of obj) {
                  if (item && typeof item === 'object' && (item.name || item.productName) && (item.price || item.formattedPrice)) {
                    results.push({
                      name: item.name || item.productName || '',
                      price: item.formattedPrice || item.price?.formatted || String(item.price) || '',
                      url: item.productPageUrl || item.url || '',
                      image: item.mainMedia?.image?.url || item.media?.[0]?.url || item.imageUrl || '',
                      imageAlt: item.name || '',
                    });
                  }
                }
              }
              if (obj && typeof obj === 'object') {
                for (const key of Object.keys(obj)) {
                  findProducts(obj[key], depth + 1);
                }
              }
            };
            findProducts(data);
          }
        } catch {}
      }
    }

    // Get full page text for debugging
    const bodyText = document.body.innerText.substring(0, 5000);

    // Get all visible images (may help identify product images)
    const allImages = Array.from(document.querySelectorAll('img'))
      .filter(img => img.src && !img.src.includes('data:') && img.naturalWidth > 50)
      .map(img => ({ src: img.src, alt: img.alt, width: img.naturalWidth, height: img.naturalHeight }));

    return { products: results, bodyText, imageCount: allImages.length, allImages: allImages.slice(0, 100) };
  });

  console.log(`  Found ${products.products.length} product cards`);
  console.log(`  Total images on page: ${products.imageCount}`);

  return products;
}

async function extractProductDetail(page, productUrl) {
  const slug = productUrl.split('/product-page/')[1] || productUrl;
  console.log(`\n🛍️  Extracting product detail: ${slug}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait specifically for product content to render
    const productSelectors = [
      '[data-hook="product-title"]',
      '[data-hook="product-description"]',
      '[data-hook="product-price"]',
      'h1[class*="product"]',
      '[class*="ProductPage"]',
    ];

    let productFound = false;
    for (const sel of productSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        productFound = true;
        console.log(`  ✓ Product rendered (${sel})`);
        break;
      } catch {}
    }

    if (!productFound) {
      // Fallback: wait longer for networkidle + extra time
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    // Take product screenshot
    const screenshotPath = path.join(PRODUCTS_DIR, `${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const product = await page.evaluate(() => {
      // Product name
      const nameEl = document.querySelector(
        '[data-hook="product-title"], ' +
        'h1[class*="product"], ' +
        '[data-hook="product-page-title"]'
      );

      // Price
      const priceEl = document.querySelector(
        '[data-hook="product-price"], ' +
        '[data-hook="formatted-primary-price"], ' +
        '[class*="ProductPrice"]'
      );

      // Description
      const descEl = document.querySelector(
        '[data-hook="product-description"], ' +
        '[data-hook="info-section-description"]'
      );

      // Images - product gallery
      const galleryImages = Array.from(document.querySelectorAll(
        '[data-hook="product-image"] img, ' +
        '[data-hook="main-media-image-wrapper"] img, ' +
        '[data-hook="thumbnail-image"] img, ' +
        '[class*="product-gallery"] img, ' +
        '[class*="ProductGallery"] img'
      )).map(img => ({
        src: img.src,
        alt: img.alt || '',
      })).filter(img => img.src && !img.src.includes('data:'));

      // Also get all wix static images as fallback
      const allProductImages = Array.from(document.querySelectorAll('img'))
        .filter(img => img.src && img.src.includes('wixstatic') && img.naturalWidth > 100)
        .map(img => ({ src: img.src, alt: img.alt || '' }));

      // Options/variants
      const options = [];
      document.querySelectorAll(
        '[data-hook="product-options"] select, ' +
        '[data-hook="option-selector"], ' +
        '[class*="OptionSelector"]'
      ).forEach(sel => {
        const label = sel.closest('[data-hook="product-options-item"]')?.querySelector('label, [class*="title"]')?.innerText || '';
        const values = Array.from(sel.querySelectorAll('option')).map(opt => opt.text.trim()).filter(t => t && t !== 'Select');
        if (values.length > 0) {
          options.push({ label: label.trim(), values });
        }
      });

      // Also check for color/size swatch buttons
      document.querySelectorAll('[data-hook="color-swatch-button"], [data-hook="option-button"]').forEach(btn => {
        // color swatches are more complex
      });

      // SKU
      const skuEl = document.querySelector('[data-hook="product-sku"]');

      // Check for structured data (JSON-LD)
      let structuredData = null;
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'Product' || data.offers) {
            structuredData = data;
          }
        } catch {}
      }

      const bodyText = document.body.innerText.substring(0, 3000);

      return {
        name: nameEl ? nameEl.innerText.trim() : '',
        price: priceEl ? priceEl.innerText.trim() : '',
        description: descEl ? descEl.innerHTML : '',
        descriptionText: descEl ? descEl.innerText.trim() : '',
        images: galleryImages.length > 0 ? galleryImages : allProductImages.slice(0, 10),
        options,
        sku: skuEl ? skuEl.innerText.trim() : '',
        structuredData,
        bodyText,
        notFound: bodyText.includes("couldn't be found") || bodyText.includes('product not found'),
      };
    });

    if (product.notFound) {
      console.log(`  ⚠️  Product page says "not found"`);
    } else {
      console.log(`  Name: ${product.name || '(not found)'}`);
      console.log(`  Price: ${product.price || '(not found)'}`);
      console.log(`  Images: ${product.images.length}`);
      console.log(`  Options: ${product.options.length}`);
    }

    product.slug = slug;
    product.url = productUrl;
    return product;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return { slug, url: productUrl, error: err.message, notFound: true };
  }
}

async function main() {
  console.log('🚀 Starting improved product extraction from thememdex100.com\n');
  console.log('============================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Set longer default timeouts
  page.setDefaultTimeout(30000);

  // ============================================================
  // PHASE 1: Extract products from category/all-products page
  // ============================================================
  console.log('\n📋 PHASE 1: Extracting from category pages...');
  console.log('============================================================\n');

  let allProductCards = [];

  for (const category of CATEGORY_URLS) {
    const result = await extractProductsFromCategoryPage(page, category.url, category.name);
    if (result.products.length > 0) {
      allProductCards.push(...result.products);
    } else {
      // Save debug info
      fs.writeFileSync(
        path.join(DATA_DIR, 'category-debug.json'),
        JSON.stringify(result, null, 2)
      );
      console.log('  💾 Debug data saved to data/category-debug.json');
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  allProductCards = allProductCards.filter(p => {
    if (!p.url || seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  console.log(`\n✅ Found ${allProductCards.length} unique product cards total`);

  // ============================================================
  // PHASE 2: Visit each product page for full details
  // ============================================================
  console.log('\n📋 PHASE 2: Extracting product details...');
  console.log('============================================================\n');

  const products = [];

  if (allProductCards.length > 0) {
    for (const card of allProductCards) {
      if (card.url) {
        const detail = await extractProductDetail(page, card.url);
        // Merge card data with detail data
        products.push({
          slug: detail.slug || card.url.split('/product-page/')[1] || '',
          name: detail.name || card.name || '',
          price: detail.price || card.price || '',
          description: detail.descriptionText || '',
          descriptionHtml: detail.description || '',
          images: detail.images?.length > 0 ? detail.images : (card.image ? [{ src: card.image, alt: card.imageAlt }] : []),
          options: detail.options || [],
          sku: detail.sku || '',
          structuredData: detail.structuredData || null,
          categoryImage: card.image || '',
          notFound: detail.notFound || false,
        });
      }
    }
  } else {
    console.log('\n⚠️  No products found from category page. Trying direct approach...');
    console.log('  Attempting to find products via Wix internal APIs...\n');

    // Try intercepting Wix API calls on the category page
    const apiProducts = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/stores/') || url.includes('/ecom/') || url.includes('/products')) {
        try {
          const json = await response.json();
          apiProducts.push({ url, data: json });
        } catch {}
      }
    });

    // Navigate again to capture API calls
    await page.goto(`${BASE_URL}/category/all-products`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(10000);

    // Scroll to trigger lazy loading
    await scrollToBottom(page);
    await page.waitForTimeout(5000);

    if (apiProducts.length > 0) {
      console.log(`  📡 Captured ${apiProducts.length} API responses`);
      fs.writeFileSync(
        path.join(DATA_DIR, 'api-products.json'),
        JSON.stringify(apiProducts, null, 2)
      );
      console.log('  💾 API data saved to data/api-products.json');
    }

    // Also dump full page HTML for analysis
    const html = await page.content();
    fs.writeFileSync(path.join(DATA_DIR, 'category-page.html'), html);
    console.log('  💾 Full page HTML saved to data/category-page.html');

    // Try to extract any product-like data from the page
    const pageData = await page.evaluate(() => {
      // Look for any product data in window/global scope
      const productData = {};

      // Check for Wix Stores data in window
      if (window.wixDevelopersAnalytics) productData.analytics = true;

      // Look for products in any global variable
      const globals = Object.keys(window).filter(k =>
        k.toLowerCase().includes('product') ||
        k.toLowerCase().includes('store') ||
        k.toLowerCase().includes('catalog')
      );
      productData.globals = globals;

      // Check for all script tags with JSON data
      const jsonScripts = [];
      document.querySelectorAll('script[type="application/json"]').forEach(s => {
        try {
          const data = JSON.parse(s.textContent);
          const str = JSON.stringify(data).substring(0, 500);
          if (str.includes('product') || str.includes('price') || str.includes('catalog')) {
            jsonScripts.push({ id: s.id, preview: str.substring(0, 200) });
          }
        } catch {}
      });
      productData.jsonScripts = jsonScripts;

      // Get all link hrefs that might be product links
      const allLinks = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: a.innerText.trim().substring(0, 100) }))
        .filter(l => l.href.includes('product') || l.href.includes('shop') || l.href.includes('store'));
      productData.productLinks = allLinks;

      // Full body text (first 10k chars)
      productData.bodyText = document.body.innerText.substring(0, 10000);

      return productData;
    });

    fs.writeFileSync(
      path.join(DATA_DIR, 'category-page-data.json'),
      JSON.stringify(pageData, null, 2)
    );
    console.log('  💾 Page data saved to data/category-page-data.json');
  }

  // ============================================================
  // PHASE 3: Save results
  // ============================================================
  console.log('\n📋 PHASE 3: Saving results...');
  console.log('============================================================\n');

  // Save products
  const validProducts = products.filter(p => !p.notFound && p.name);
  const invalidProducts = products.filter(p => p.notFound || !p.name);

  fs.writeFileSync(
    path.join(DATA_DIR, 'products-v2.json'),
    JSON.stringify(validProducts, null, 2)
  );
  console.log(`✅ Saved ${validProducts.length} valid products to data/products-v2.json`);

  if (invalidProducts.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, 'products-failed.json'),
      JSON.stringify(invalidProducts, null, 2)
    );
    console.log(`⚠️  ${invalidProducts.length} products failed (saved to data/products-failed.json)`);
  }

  // ============================================================
  // PHASE 4: Download product images
  // ============================================================
  if (validProducts.length > 0) {
    console.log('\n📋 PHASE 4: Downloading product images...');
    console.log('============================================================\n');

    for (const product of validProducts) {
      const productDir = path.join(PRODUCTS_DIR, product.slug);
      fs.mkdirSync(productDir, { recursive: true });

      for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        let imgUrl = img.src || img;

        // Clean up Wix image URLs — get full resolution
        if (imgUrl.includes('wixstatic.com')) {
          // Remove size constraints from URL
          imgUrl = imgUrl.replace(/\/v1\/fill\/[^/]+\//, '/v1/fill/w_800,h_800,al_c,q_85/');
        }

        const ext = imgUrl.includes('.png') ? '.png' : imgUrl.includes('.webp') ? '.webp' : '.jpg';
        const destPath = path.join(productDir, `img-${i}${ext}`);

        try {
          await downloadFile(imgUrl, destPath);
          console.log(`  ✅ ${product.slug}/img-${i}${ext}`);
        } catch (err) {
          console.log(`  ❌ ${product.slug}/img-${i}${ext}: ${err.message}`);
        }
      }
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n============================================================');
  console.log('📊 EXTRACTION SUMMARY');
  console.log('============================================================');
  console.log(`  Products found on category page: ${allProductCards.length}`);
  console.log(`  Products with full details: ${validProducts.length}`);
  console.log(`  Products failed/not found: ${invalidProducts.length}`);
  if (validProducts.length > 0) {
    console.log('\n  Valid products:');
    validProducts.forEach(p => {
      console.log(`    - ${p.name} | ${p.price} | ${p.images.length} images`);
    });
  }

  await browser.close();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
