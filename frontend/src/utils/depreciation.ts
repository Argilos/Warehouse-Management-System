// Asset Financial Depreciation Utility Engine

export interface DepreciationProjection {
  year: number;
  date: string;
  startValue: number;
  depreciationAmount: number;
  endValue: number;
}

/**
 * Calculates current depreciated book value of an asset using Straight-Line Depreciation.
 */
export function calculateCurrentAssetValue(
  purchasePrice: number,
  purchaseDate: string,
  annualDepreciationRate: number // percentage e.g. 5, 10
): number {
  if (!purchasePrice || purchasePrice <= 0) return 0;

  const pDate = new Date(purchaseDate);
  const now = new Date();
  
  // Calculate elapsed years with precision
  const diffTime = Math.abs(now.getTime() - pDate.getTime());
  const elapsedYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  const annualDepreciation = purchasePrice * (annualDepreciationRate / 100);
  const totalDepreciation = annualDepreciation * elapsedYears;

  const currentValue = purchasePrice - totalDepreciation;
  return Math.max(0, Math.round(currentValue * 100) / 100);
}

/**
 * Generates a 5-year financial depreciation schedule for an asset.
 */
export function generateDepreciationSchedule(
  purchasePrice: number,
  purchaseDate: string,
  annualDepreciationRate: number,
  yearsToProject = 5
): DepreciationProjection[] {
  const schedule: DepreciationProjection[] = [];
  const startYear = new Date(purchaseDate).getFullYear();
  let currentValue = purchasePrice;
  const annualDep = purchasePrice * (annualDepreciationRate / 100);

  for (let i = 0; i <= yearsToProject; i++) {
    const yr = startYear + i;
    const depThisYear = i === 0 ? 0 : Math.min(currentValue, annualDep);
    const endVal = Math.max(0, currentValue - depThisYear);

    schedule.push({
      year: yr,
      date: `Jan 1, ${yr}`,
      startValue: Math.round(currentValue * 100) / 100,
      depreciationAmount: Math.round(depThisYear * 100) / 100,
      endValue: Math.round(endVal * 100) / 100,
    });

    currentValue = endVal;
  }

  return schedule;
}

/**
 * Format currency to USD / Euro standard
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
