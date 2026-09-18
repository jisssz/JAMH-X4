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


