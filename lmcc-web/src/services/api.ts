export interface IssueDetail {
  ruleId: string;
  field: string;
  title: string;
  severity: string;
  detectedValue?: string;
  explanation: string;
  evidence?: string;
  recommendation?: string;
  source?: string;
  gazetteReference?: string;
}

export interface ReportCreatePayload {
  verdict: 'PASS' | 'REVIEW';
  productName?: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  dateDeclaration?: string;
  consumerCare?: string;
  issueCount?: number;
  issues: IssueDetail[];
  rawOcr?: string;
  userRemarks?: string;
  localReportId?: string;
}

export interface ReportResponse {
  id: string;
  status: string;
}

export interface ReportRead {
  id: string;
  createdAt: string;
  verdict: string;
  productName?: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  dateDeclaration?: string;
  consumerCare?: string;
  issueCount: number;
  issues: IssueDetail[];
  rawOcr?: string;
  userRemarks?: string;
  localReportId?: string;
}

// Robust resolution of backend API Base URL:
// Reads VITE_API_URL if defined; defaults to local FastAPI server http://localhost:8000
const rawApiUrl =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:8000';

// Sanitize URL:
// 1. Strip trailing slashes (e.g. "https://api.onrender.com/" -> "https://api.onrender.com")
// 2. Strip redundant trailing '/api' (e.g. "https://api.onrender.com/api" -> "https://api.onrender.com")
// This ensures all endpoints formed as `${API_BASE_URL}/api/...` are clean without // or /api/api
export const API_BASE_URL = String(rawApiUrl)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');


/**
 * Health check to verify backend server accessibility.
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Submits client-screened observation to the backend SQLite registry.
 * Image is intentionally NOT transmitted; privacy and zero server-side OCR preserved.
 */
export async function submitReport(payload: ReportCreatePayload): Promise<ReportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const data = await response.json();
      if (data && data.detail) {
        errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Ignore JSON parse errors on non-json error responses
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Retrieves recent compliance screening reports from the backend registry.
 */
export async function getReports(limit: number = 50): Promise<ReportRead[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reports?limit=${limit}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      let errorDetail = `Failed to retrieve reports (${response.status})`;
      try {
        const data = await response.json();
        if (data && data.detail) {
          errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch {
        // Fallback
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Unable to connect to reporting server. Please ensure the backend is running.');
    }
    throw err;
  }
}

/**
 * Retrieves a single compliance screening report by ID.
 */
export async function getReport(id: string): Promise<ReportRead> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Report not found (ID: ${id})`);
      }
      let errorDetail = `Failed to retrieve report ${id} (${response.status})`;
      try {
        const data = await response.json();
        if (data && data.detail) {
          errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch {
        // Fallback
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Unable to connect to reporting server. Please ensure the backend is running.');
    }
    throw err;
  }
}

export interface AnalyticsSummary {
  totalScans: number;
  passCount: number;
  reviewCount: number;
  passRate: number;
  totalIssues: number;
  isDemonstrationData: boolean;
  lastUpdated: string;
  disclaimer: string;
}

export interface IssueFrequencyItem {
  field: string;
  ruleReference: string;
  count: number;
  percentage: number;
}

export interface IssuesBreakdown {
  items: IssueFrequencyItem[];
  totalIssues: number;
  isDemonstrationData: boolean;
}

export interface CategoryBreakdownItem {
  category: string;
  screenings: number;
  reviewCount: number;
  reviewRate: number;
}

export interface CategoriesBreakdown {
  items: CategoryBreakdownItem[];
  isDemonstrationData: boolean;
}

export interface TrendItem {
  period: string;
  scans: number;
  reviews: number;
}

export interface TrendsResponse {
  items: TrendItem[];
  isDemonstrationData: boolean;
}

export interface BrandSurveillanceItem {
  manufacturer: string;
  screenings: number;
  reviewCount: number;
  reviewRate: number;
}

export interface BrandsResponse {
  items: BrandSurveillanceItem[];
  isDemonstrationData: boolean;
  notice: string;
}

export const FALLBACK_DEMO_SUMMARY: AnalyticsSummary = {
  totalScans: 1420,
  passCount: 1048,
  reviewCount: 372,
  passRate: 73.8,
  totalIssues: 565,
  isDemonstrationData: true,
  lastUpdated: new Date().toISOString(),
  disclaimer:
    'Screening observations are advisory consumer indicators. Does not constitute official judicial non-compliance.',
};

export const FALLBACK_DEMO_ISSUES: IssuesBreakdown = {
  items: [
    { field: 'MRP / Unit Sale Price', ruleReference: 'Rule 6(1)(e)', count: 184, percentage: 32.6 },
    { field: 'Date of Mfg / Expiry', ruleReference: 'Rule 6(1)(d)', count: 112, percentage: 19.8 },
    { field: 'Consumer Care Helpline', ruleReference: 'Rule 6(1)(g)', count: 98, percentage: 17.3 },
    { field: 'Net Quantity & Fonts', ruleReference: 'Rule 6(1)(c) & R-7', count: 76, percentage: 13.5 },
    { field: 'Manufacturer / Packer Address', ruleReference: 'Rule 6(1)(a)-(b)', count: 64, percentage: 11.3 },
    { field: 'Multi-Panel Discrepancy', ruleReference: 'Rule 6 Consistency', count: 31, percentage: 5.5 },
  ],
  totalIssues: 565,
  isDemonstrationData: true,
};

export const FALLBACK_DEMO_CATEGORIES: CategoriesBreakdown = {
  items: [
    { category: 'Packaged Foods & Staples', screenings: 520, reviewCount: 126, reviewRate: 24.2 },
    { category: 'Snacks & Confectionery', screenings: 380, reviewCount: 108, reviewRate: 28.4 },
    { category: 'Beverages & Dairy', screenings: 240, reviewCount: 52, reviewRate: 21.7 },
    { category: 'Personal Care & Toiletries', screenings: 180, reviewCount: 56, reviewRate: 31.1 },
    { category: 'Household & Cleaning', screenings: 100, reviewCount: 30, reviewRate: 30.0 },
  ],
  isDemonstrationData: true,
};

export const FALLBACK_DEMO_TRENDS: TrendsResponse = {
  items: [
    { period: 'Apr 2024', scans: 140, reviews: 42 },
    { period: 'May 2024', scans: 185, reviews: 51 },
    { period: 'Jun 2024', scans: 220, reviews: 58 },
    { period: 'Jul 2024', scans: 265, reviews: 69 },
    { period: 'Aug 2024', scans: 310, reviews: 78 },
    { period: 'Sep 2024', scans: 300, reviews: 74 },
  ],
  isDemonstrationData: true,
};

export const FALLBACK_DEMO_BRANDS: BrandsResponse = {
  items: [
    { manufacturer: 'Britannia Industries Ltd', screenings: 142, reviewCount: 28, reviewRate: 19.7 },
    { manufacturer: 'Parle Products Pvt Ltd', screenings: 128, reviewCount: 24, reviewRate: 18.8 },
    { manufacturer: 'ITC Limited', screenings: 115, reviewCount: 22, reviewRate: 19.1 },
    { manufacturer: 'Nestle India Ltd', screenings: 98, reviewCount: 19, reviewRate: 19.4 },
    { manufacturer: 'Hindustan Unilever Ltd', screenings: 86, reviewCount: 16, reviewRate: 18.6 },
    { manufacturer: 'Regional / Local Packers', screenings: 310, reviewCount: 148, reviewRate: 47.7 },
  ],
  isDemonstrationData: true,
  notice:
    'Screening counts represent automated consumer observations and do not reflect official judicial or regulatory violations.',
};

export async function getAnalyticsSummary(demo?: boolean): Promise<AnalyticsSummary> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/summary${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_SUMMARY;
      throw new Error(`Failed to fetch analytics summary (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_SUMMARY;
    throw err;
  }
}

export async function getAnalyticsIssues(demo?: boolean): Promise<IssuesBreakdown> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/issues${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_ISSUES;
      throw new Error(`Failed to fetch issues breakdown (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_ISSUES;
    throw err;
  }
}

export async function getAnalyticsCategories(demo?: boolean): Promise<CategoriesBreakdown> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/categories${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_CATEGORIES;
      throw new Error(`Failed to fetch categories breakdown (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_CATEGORIES;
    throw err;
  }
}

export async function getAnalyticsTrends(demo?: boolean): Promise<TrendsResponse> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/trends${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_TRENDS;
      throw new Error(`Failed to fetch analytics trends (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_TRENDS;
    throw err;
  }
}

export async function getAnalyticsBrands(demo?: boolean): Promise<BrandsResponse> {
  const query = demo !== undefined ? `?demo=${demo}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/brands${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (demo) return FALLBACK_DEMO_BRANDS;
      throw new Error(`Failed to fetch brand surveillance (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (demo) return FALLBACK_DEMO_BRANDS;
    throw err;
  }
}


