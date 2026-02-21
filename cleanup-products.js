/**
 * Cleanup and enrich products-v2.json into final products.json
 * - Fix prices (remove "\nPrice" suffix)
 * - Pull descriptions from structured data
 * - Get high-res image URLs from structured data
 * - Assign categories based on product names
 * - Map local image paths
 */

const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products-v2.json'), 'utf-8'));

// Category detection rules — checked in order, first match wins
// Use word-boundary regex to avoid false matches (e.g. "tee" in "steel")
const categoryRules = [
  { category: 'Drinkware', patterns: [/\bmug\b/, /\bcup\b/, /\bwater bottle\b/, /\bbottle\b/, /\bceramic\b/] },
  { category: 'Hoodies & Sweatshirts', patterns: [/\bhoodie\b/, /\bsweatshirt\b/, /\bpullover\b/] },
  { category: 'Hats', patterns: [/\bhat\b/, /\bcap\b/, /\btrucker\b/] },
  { category: 'Footwear', patterns: [/\bsneaker/, /\bslides?\b/, /\bshoe/] },
  { category: 'Accessories', patterns: [/\bcandle\b/, /\bsticker/, /\blicense plate\b/, /\bdecal\b/, /\bphone case\b/] },
  { category: 'T-Shirts', patterns: [/\bt-shirt\b/, /\btee\b/, /\bt‑shirt\b/] },
];

function detectCategory(name) {
  const lower = name.toLowerCase();
  for (const rule of categoryRules) {
    if (rule.patterns.some(p => p.test(lower))) {
      return rule.category;
    }
  }
  return 'Other';
}

function cleanPrice(price) {
  if (!price) return '';
  // Remove "\nPrice" or just "Price" suffix
  return price.replace(/\n?Price$/i, '').trim();
}

function getNumericPrice(price) {
  const match = price.match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

const products = raw.map((p, index) => {
  const sd = p.structuredData || {};
  const offer = sd.Offers || sd.offers || {};

  // Get description from structured data (much richer than DOM)
  let description = '';
  if (sd.description) {
    description = sd.description;
  } else if (p.description) {
    description = p.description;
  }

  // Clean up description - split into short description and details
  let shortDescription = '';
  let fullDescription = description;
  if (description.length > 200) {
    // First sentence or first 200 chars
    const firstSentence = description.match(/^[^.!?]+[.!?]/);
    shortDescription = firstSentence ? firstSentence[0] : description.substring(0, 200) + '...';
  } else {
    shortDescription = description;
  }

  // Get proper price
  const cleanedPrice = cleanPrice(p.price);
  const numericPrice = offer.price ? parseFloat(offer.price) : getNumericPrice(cleanedPrice);
  const currency = offer.priceCurrency || 'USD';

  // Get high-res images from structured data
  let images = [];
  if (sd.image && Array.isArray(sd.image)) {
    images = sd.image.map((img, i) => {
      const url = typeof img === 'string' ? img : (img.contentUrl || '');
      // Get high-res version
      const highRes = url.replace(/w_\d+,h_\d+/, 'w_800,h_800');
      return {
        url: highRes,
        thumbnail: typeof img === 'object' && img.thumbnail ? img.thumbnail.contentUrl : highRes.replace(/w_800,h_800/, 'w_200,h_200'),
        alt: p.name,
        local: `assets/products/${p.slug}/img-${i}.jpg`,
      };
    });
  }

  // Fallback/supplement with DOM-extracted images if structured data has few
  const domImages = (p.images || [])
    .filter(img => !img.alt?.startsWith('Thumbnail:') && img.src)
    .map((img, i) => ({
      url: img.src,
      thumbnail: img.src,
      alt: img.alt || p.name,
      local: `assets/products/${p.slug}/img-${i}.jpg`,
    }));

  if (images.length === 0) {
    images = domImages;
  } else if (images.length < 3 && domImages.length > images.length) {
    // Structured data had very few images, use DOM images instead
    images = domImages;
  }

  const category = detectCategory(p.name);

  return {
    id: `product-${index + 1}`,
    slug: p.slug,
    name: p.name,
    shortDescription,
    description: fullDescription,
    price: numericPrice,
    formattedPrice: `$${numericPrice.toFixed(2)}`,
    currency,
    category,
    images,
    options: p.options || [],
    sku: p.sku || '',
    inStock: (offer.Availability || offer.availability || '').includes('InStock'),
    url: `shop/product.html?product=${p.slug}`,
  };
});

// Sort by category then name
products.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

// Save final products.json
fs.writeFileSync(
  path.join(__dirname, 'data', 'products.json'),
  JSON.stringify(products, null, 2)
);

// Print summary
console.log('Products cleaned and saved to data/products.json\n');
console.log(`Total: ${products.length} products\n`);

const categories = {};
products.forEach(p => {
  categories[p.category] = (categories[p.category] || 0) + 1;
});
console.log('Categories:');
Object.entries(categories).sort().forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log('\nProducts:');
products.forEach(p => {
  console.log(`  [${p.category}] ${p.name} — ${p.formattedPrice} (${p.images.length} images)`);
});
