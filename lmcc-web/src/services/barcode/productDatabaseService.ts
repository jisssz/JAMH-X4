export interface ReferenceProductInfo {
  barcode: string;
  source: 'Open Food Facts' | 'Unrecognized';
  found: boolean;
  productName?: string;
  brands?: string;
  quantity?: string;
  categories?: string;
  countries?: string;
  imageUrl?: string;
  disclaimer: string;
}

const DEFAULT_DISCLAIMER =
  'Reference database metadata is crowdsourced/public reference information only. It does not constitute official Legal Metrology compliance verification or government endorsement.';

/**
 * Queries the legitimate, publicly accessible Open Food Facts API v2 for reference product metadata.
 * Implements a strict timeout to ensure offline or slow network conditions never stall OCR screening.
 */
/**
 * Safely extracts package quantity from Open Food Facts product payload.
 * Avoids operator precedence ambiguities between p.quantity and p.net_weight_value.
 */
export function extractProductQuantity(p: any): string | undefined {
  if (!p) return undefined;
  if (typeof p.quantity === 'string' && p.quantity.trim().length > 0) {
    return p.quantity.trim();
  }
  if (p.net_weight_value !== undefined && p.net_weight_value !== null && String(p.net_weight_value).trim().length > 0) {
    const unit = p.net_weight_unit ? String(p.net_weight_unit).trim() : '';
    return `${p.net_weight_value} ${unit}`.trim();
  }
  return undefined;
}

export async function lookupProductByBarcode(
  barcode: string,
  timeoutMs: number = 4000
): Promise<ReferenceProductInfo> {
  const cleanBarcode = barcode.replace(/\D/g, '');

  if (!cleanBarcode || cleanBarcode.length < 8) {
    return {
      barcode,
      source: 'Unrecognized',
      found: false,
      disclaimer: DEFAULT_DISCLAIMER,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        barcode: cleanBarcode,
        source: 'Open Food Facts',
        found: false,
        disclaimer: DEFAULT_DISCLAIMER,
      };
    }

    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const productName = p.product_name_en || p.product_name || p.generic_name;
      const brands = p.brands || p.brand_owner;
      const quantity = extractProductQuantity(p);
      const categories = p.categories;
      const countries = p.countries;
      const imageUrl = p.image_front_url || p.image_url;

      return {
        barcode: cleanBarcode,
        source: 'Open Food Facts',
        found: true,
        productName: productName?.trim(),
        brands: brands?.trim(),
        quantity: quantity?.trim(),
        categories: categories?.trim(),
        countries: countries?.trim(),
        imageUrl,
        disclaimer: DEFAULT_DISCLAIMER,
      };
    }

    return {
      barcode: cleanBarcode,
      source: 'Open Food Facts',
      found: false,
      disclaimer: DEFAULT_DISCLAIMER,
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      barcode: cleanBarcode,
      source: 'Open Food Facts',
      found: false,
      disclaimer: DEFAULT_DISCLAIMER,
    };
  }
}
