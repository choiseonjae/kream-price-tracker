import * as cheerio from 'cheerio';

export interface KreamProductData {
  title: string;
  brand: string;
  modelCode: string | null;
  imageUrl: string | null;
  price: number;
}

export async function crawlKreamProduct(url: string): Promise<KreamProductData> {
  try {
    // Fetch the KREAM page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch KREAM page: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract product information
    // Note: These selectors are examples and need to be updated based on actual KREAM HTML structure
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('.product_title').text().trim() ||
                  $('h1').first().text().trim();

    const brand = $('.product_info_brand').text().trim() ||
                  $('.brand_name').text().trim() ||
                  'Unknown';

    const modelCode = $('.product_code').text().trim() ||
                      $('.model_number').text().trim() ||
                      null;

    const imageUrl = $('meta[property="og:image"]').attr('content') ||
                     $('.product_img img').attr('src') ||
                     null;

    // Extract price - this is a critical part and needs accurate selectors
    const priceText = $('.price').first().text().trim() ||
                      $('.selling_price').text().trim() ||
                      $('.instant_price').text().trim();

    // Remove non-numeric characters and parse price
    const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

    if (!title || isNaN(price)) {
      throw new Error('Failed to extract required product information');
    }

    return {
      title,
      brand,
      modelCode,
      imageUrl,
      price,
    };
  } catch (error) {
    console.error('Error crawling KREAM product:', error);
    throw new Error('Failed to crawl KREAM product. The page structure may have changed.');
  }
}

export function validateKreamUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('kream.co.kr') && urlObj.pathname.includes('/products/');
  } catch {
    return false;
  }
}
