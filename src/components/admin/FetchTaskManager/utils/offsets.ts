/**
 * Offset 枚举工具函数
 */

import { parseNumber } from "./payload";

export const enumerateOffsets = (startValue: string, endValue: string, stepValue: string) => {
  const start = parseNumber(startValue);
  const end = parseNumber(endValue);
  const step = parseNumber(stepValue);
  if (start == null || end == null || step == null || step <= 0 || end < start) {
    return [];
  }
  const result: number[] = [];
  for (let current = start; current <= end; current += step) {
    result.push(current);
  }
  return result;
};
