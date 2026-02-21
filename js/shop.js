/* ============================================
   MemDex100 Shop JavaScript — shop.js
   Product grid, filtering, sorting, product detail,
   quantity selector, variant selector, tabs
   ============================================ */

// Module-level state
let allProducts = [];
let currentFilter = 'all';
let currentSort = 'default';

// ========== Initialize on DOMContentLoaded ==========
document.addEventListener('DOMContentLoaded', () => {

  // ========== Filter Toggle (Mobile) ==========
  const filterToggle = document.querySelector('.filter-toggle');
  const sidebar = document.getElementById('shop-sidebar');

  if (filterToggle && sidebar) {
    filterToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      const expanded = sidebar.classList.contains('open');
      filterToggle.setAttribute('aria-expanded', expanded);
    });
  }

  // ========== Category Filter Buttons ==========
  const categoryFilters = document.querySelectorAll('.filter-item[data-category]');
  categoryFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.dataset.category;
      currentFilter = category;
      filterProducts(category);
    });
  });

  // ========== Sort Select ==========
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      sortProducts(sortSelect.value);
    });
  }

  // ========== Quantity Selector ==========
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const qtyInput = document.getElementById('qty-input');

  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      const current = parseInt(qtyInput.value) || 1;
      if (current > 1) {
        qtyInput.value = current - 1;
        updateAddToCartQuantity();
      }
    });

    qtyPlus.addEventListener('click', () => {
      const current = parseInt(qtyInput.value) || 1;
      if (current < 99) {
        qtyInput.value = current + 1;
        updateAddToCartQuantity();
      }
    });

    qtyInput.addEventListener('change', () => {
      let val = parseInt(qtyInput.value) || 1;
      val = Math.max(1, Math.min(99, val));
      qtyInput.value = val;
      updateAddToCartQuantity();
    });
  }

  // ========== Product Detail Tabs ==========
  const tabs = document.querySelectorAll('.tab[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      const targetPanel = document.getElementById(targetId);
      if (!targetPanel) return;

      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      // Activate target
      tab.classList.add('active');
      targetPanel.classList.add('active');
    });
  });

  // ========== Variant Options ==========
  const variantOptions = document.querySelectorAll('.variant-option');
  variantOptions.forEach(option => {
    option.addEventListener('click', () => {
      if (option.classList.contains('out-of-stock')) return;
      variantOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  // ========== Product Image Gallery ==========
  const mainImage = document.getElementById('product-main-image');
  const thumbs = document.querySelectorAll('.product-gallery-thumb');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const img = thumb.querySelector('img');
      if (mainImage && img) {
        mainImage.src = img.src;
        mainImage.alt = img.alt;
      }
    });
  });

  // ========== Initialize Shop Pages ==========
  const productGrid = document.getElementById('product-grid');
  const productDetail = document.getElementById('product-detail');

  if (productGrid) {
    // We're on the shop index page
    initProductGrid();
  } else if (productDetail) {
    // We're on the product detail page
    initProductDetail();
  }

  // ========== Update Snipcart Cart Count ==========
  updateCartCount();

  // Listen for Snipcart events to update cart count
  document.addEventListener('snipcart.ready', () => {
    Snipcart.events.on('cart.confirmed', () => updateCartCount());
    Snipcart.events.on('item.added', () => updateCartCount());
    Snipcart.events.on('item.removed', () => updateCartCount());
  });

});

// ========== Update Cart Count Badge ==========
function updateCartCount() {
  const cartCountElements = document.querySelectorAll('.snipcart-items-count');

  // Try to get count from Snipcart if available
  if (typeof Snipcart !== 'undefined' && Snipcart.store) {
    try {
      const state = Snipcart.store.getState();
      const count = state.cart.items.count || 0;
      cartCountElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-block' : 'none';
      });
    } catch (e) {
      // Snipcart not ready yet
      cartCountElements.forEach(el => {
        el.textContent = '0';
        el.style.display = 'none';
      });
    }
  } else {
    cartCountElements.forEach(el => {
      el.textContent = '0';
      el.style.display = 'none';
    });
  }
}

// ========== Update Add to Cart Button Quantity ==========
function updateAddToCartQuantity() {
  const addToCartBtn = document.getElementById('add-to-cart');
  const qtyInput = document.getElementById('qty-input');

  if (addToCartBtn && qtyInput) {
    const qty = parseInt(qtyInput.value) || 1;
    addToCartBtn.setAttribute('data-item-quantity', qty);
  }
}

// ========== Initialize Product Grid Page ==========
async function initProductGrid() {
  try {
    await loadProducts();

    // Populate category filters
    populateCategoryFilters();

    // Check for category filter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');

    if (categoryParam) {
      currentFilter = categoryParam;
      // Activate the corresponding filter button
      const filterBtn = document.querySelector(`.filter-item[data-category="${categoryParam}"]`);
      if (filterBtn) {
        document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
        filterBtn.classList.add('active');
      }
    }

    // Render products
    filterAndRenderProducts();
  } catch (error) {
    console.error('Error initializing product grid:', error);
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="shop-empty" style="grid-column: 1 / -1;">
          <h3>Error loading products</h3>
          <p>Please try again later.</p>
        </div>
      `;
    }
  }
}

// ========== Initialize Product Detail Page ==========
async function initProductDetail() {
  try {
    await loadProducts();

    // Get product slug from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productSlug = urlParams.get('product');

    if (!productSlug) {
      throw new Error('No product specified');
    }

    // Find the product
    const product = allProducts.find(p => p.slug === productSlug);

    if (!product) {
      throw new Error('Product not found');
    }

    // Render product details
    renderProductDetail(product);
  } catch (error) {
    console.error('Error loading product detail:', error);
    document.getElementById('product-title').textContent = 'Product Not Found';
    document.getElementById('product-description').innerHTML = '<p>Sorry, this product could not be found.</p>';
  }
}

// ========== Load Products from JSON ==========
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts; // Already loaded
  }

  const response = await fetch('../data/products.json');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  allProducts = await response.json();
  return allProducts;
}

// ========== Populate Category Filters ==========
function populateCategoryFilters() {
  const categoryFiltersContainer = document.getElementById('category-filters');
  if (!categoryFiltersContainer) return;

  // Count products by category
  const categoryCounts = {};
  allProducts.forEach(product => {
    const cat = product.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Get unique categories, sorted alphabetically
  const categories = Object.keys(categoryCounts).sort();

  // Clear existing (except "All Products")
  const allBtn = categoryFiltersContainer.querySelector('[data-category="all"]');
  categoryFiltersContainer.innerHTML = '';

  // Re-add "All Products" button
  if (allBtn) {
    const newAllBtn = allBtn.cloneNode(true);
    const count = document.createElement('span');
    count.className = 'filter-item-count';
    count.textContent = allProducts.length;
    newAllBtn.appendChild(count);
    categoryFiltersContainer.appendChild(newAllBtn);

    // Re-attach event listener
    newAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
      newAllBtn.classList.add('active');
      currentFilter = 'all';
      filterProducts('all');
    });
  }

  // Add category buttons
  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = 'filter-item';
    btn.setAttribute('data-category', category);
    btn.textContent = category;

    const count = document.createElement('span');
    count.className = 'filter-item-count';
    count.textContent = categoryCounts[category];
    btn.appendChild(count);

    categoryFiltersContainer.appendChild(btn);

    // Add event listener
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = category;
      filterProducts(category);
    });
  });
}

// ========== Filter Products ==========
function filterProducts(category) {
  currentFilter = category;
  filterAndRenderProducts();
}

// ========== Sort Products ==========
function sortProducts(sortBy) {
  currentSort = sortBy;
  filterAndRenderProducts();
}

// ========== Filter and Render Products ==========
function filterAndRenderProducts() {
  let filtered = [...allProducts];

  // Apply category filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(p => p.category === currentFilter);
  }

  // Apply sorting
  switch (currentSort) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      // Default order (as in JSON)
      break;
  }

  renderProductGrid(filtered);
}

// ========== Render Product Grid ==========
function renderProductGrid(products) {
  const grid = document.getElementById('product-grid');
  const count = document.getElementById('results-count');
  if (!grid) return;

  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="shop-empty" style="grid-column: 1 / -1;">
        <div class="shop-empty-icon">&#128722;</div>
        <h3>No products found</h3>
        <p>Try adjusting your filters or check back soon.</p>
      </div>
    `;
  } else {
    products.forEach(product => {
      grid.appendChild(renderProductCard(product));
    });
  }

  if (count) {
    count.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;
  }
}

// ========== Render Product Card ==========
function renderProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const imageSrc = product.images && product.images[0] ? `../${product.images[0].local}` : '';
  const imageFallback = product.images && product.images[0] ? product.images[0].url : '';
  const imageAlt = product.images && product.images[0] ? product.images[0].alt : product.name;

  card.innerHTML = `
    <div class="product-card-image">
      <a href="product.html?product=${product.slug}">
        <img src="${imageSrc}"
             alt="${imageAlt}"
             loading="lazy"
             onerror="this.src='${imageFallback}'">
      </a>
    </div>
    <div class="product-card-body">
      <h3 class="product-card-name">
        <a href="product.html?product=${product.slug}">${product.name}</a>
      </h3>
      <div class="product-card-price">
        ${product.formattedPrice}
      </div>
      <div class="product-card-actions">
        <a href="product.html?product=${product.slug}" class="btn btn-secondary btn-sm">View Details</a>
        <button class="snipcart-add-item btn btn-primary btn-sm"
          data-item-id="${product.id}"
          data-item-name="${product.name}"
          data-item-price="${product.price}"
          data-item-url="/shop/product.html?product=${product.slug}"
          data-item-image="${imageFallback}"
          data-item-description="${product.shortDescription}"
          data-item-quantity="1">
          Quick Add
        </button>
      </div>
    </div>
  `;

  return card;
}

// ========== Render Product Detail ==========
function renderProductDetail(product) {
  // Update page title
  document.title = `${product.name} — MemDex100 Shop`;

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb-product');
  if (breadcrumb) {
    breadcrumb.textContent = product.name;
  }

  // Update product title
  const title = document.getElementById('product-title');
  if (title) {
    title.textContent = product.name;
  }

  // Update price
  const price = document.getElementById('product-price');
  if (price) {
    price.textContent = product.formattedPrice;
  }

  // Update short description
  const description = document.getElementById('product-description');
  if (description) {
    description.innerHTML = `<p>${product.shortDescription}</p>`;
  }

  // Update full description
  const fullDescription = document.getElementById('product-full-description');
  if (fullDescription) {
    fullDescription.innerHTML = `<p>${product.description}</p>`;
  }

  // Update category
  const category = document.getElementById('product-category');
  if (category) {
    category.textContent = product.category || 'Uncategorized';
  }

  // Update SKU
  const sku = document.getElementById('product-sku');
  if (sku) {
    sku.textContent = product.sku || 'N/A';
  }

  // Update product gallery
  renderProductGallery(product);

  // Update Add to Cart button with Snipcart attributes
  const addToCartBtn = document.getElementById('add-to-cart');
  if (addToCartBtn) {
    const firstImage = product.images && product.images[0] ? product.images[0].url : '';

    addToCartBtn.className = 'snipcart-add-item btn btn-primary btn-lg';
    addToCartBtn.setAttribute('data-item-id', product.id);
    addToCartBtn.setAttribute('data-item-name', product.name);
    addToCartBtn.setAttribute('data-item-price', product.price);
    addToCartBtn.setAttribute('data-item-url', `/shop/product.html?product=${product.slug}`);
    addToCartBtn.setAttribute('data-item-image', firstImage);
    addToCartBtn.setAttribute('data-item-description', product.shortDescription);
    addToCartBtn.setAttribute('data-item-quantity', '1');
    addToCartBtn.textContent = 'Add to Cart';
  }

  // Render related products
  renderRelatedProducts(product);
}

// ========== Render Product Gallery ==========
function renderProductGallery(product) {
  const mainImage = document.getElementById('product-main-image');
  const thumbsContainer = document.getElementById('product-thumbs');

  if (!product.images || product.images.length === 0) return;

  // Set main image
  if (mainImage) {
    const firstImage = product.images[0];
    const localPath = `../${firstImage.local}`;
    mainImage.src = localPath;
    mainImage.alt = firstImage.alt || product.name;
    mainImage.onerror = function() {
      this.src = firstImage.url;
    };
  }

  // Render thumbnails
  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';

    product.images.forEach((image, index) => {
      const thumb = document.createElement('button');
      thumb.className = 'product-gallery-thumb';
      if (index === 0) thumb.classList.add('active');
      thumb.setAttribute('aria-label', `View image ${index + 1}`);

      const localPath = `../${image.local}`;

      thumb.innerHTML = `
        <img src="${localPath}"
             alt="${image.alt || product.name}"
             onerror="this.src='${image.url}'">
      `;

      thumb.addEventListener('click', () => {
        // Remove active from all thumbs
        document.querySelectorAll('.product-gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        // Update main image
        if (mainImage) {
          mainImage.src = localPath;
          mainImage.alt = image.alt || product.name;
          mainImage.onerror = function() {
            this.src = image.url;
          };
        }
      });

      thumbsContainer.appendChild(thumb);
    });
  }
}

// ========== Render Related Products ==========
function renderRelatedProducts(currentProduct) {
  const relatedContainer = document.getElementById('related-products');
  if (!relatedContainer) return;

  // Get products from the same category, excluding current product
  let related = allProducts.filter(p =>
    p.category === currentProduct.category &&
    p.id !== currentProduct.id
  );

  // Shuffle and take first 4
  related = related.sort(() => Math.random() - 0.5).slice(0, 4);

  relatedContainer.innerHTML = '';

  if (related.length === 0) {
    relatedContainer.innerHTML = '<p class="text-muted">No related products found.</p>';
    return;
  }

  related.forEach(product => {
    relatedContainer.appendChild(renderProductCard(product));
  });
}
