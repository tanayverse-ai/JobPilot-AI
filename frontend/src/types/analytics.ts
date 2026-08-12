// Mirrors backend/app/schemas/analytics.py.

export interface ActivityTrendPoint {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface ActivityTrendResponse {
  points: ActivityTrendPoint[];
}

export interface ResponseRateResponse {
  submitted: number;
  responded: number;
  rate: number; // 0-100
}
