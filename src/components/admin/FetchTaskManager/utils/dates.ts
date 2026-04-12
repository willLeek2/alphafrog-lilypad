/**
 * 日期工具函数
 */

export const compactDate = (value: string) => value.replaceAll("-", "");

export const expandDate = (value: string | number | null | undefined) => {
  if (value == null) return "";
  const str = String(value);
  if (str.length === 8) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  return str;
};

export const formatDisplayDate = (value: string) => {
  if (!value) return "";
  return value.includes("-") ? value : expandDate(value);
};

export const parseDateInput = (value: string) => {
  if (!value) return "";
  const cleaned = value.replaceAll("-", "");
  if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return value;
};

export const formatDateAsCompact = (value: string) => {
  if (!value) return "";
  return value.replaceAll("-", "");
};

export const formatDateAsDashed = (value: string) => {
  if (!value) return "";
  return expandDate(value);
};

export const enumerateDates = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const start = new Date(parseDateInput(startDate));
  const end = new Date(parseDateInput(endDate));
  const current = new Date(start);
  while (current <= end) {
    dates.push(compactDate(current.toISOString().split("T")[0]));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export const toDateTimeFilter = (date: string, endOfDay: boolean) => {
  if (!date) return undefined;
  const localTime = endOfDay ? `${date}T23:59:59.999` : `${date}T00:00:00.000`;
  return new Date(localTime).toISOString();
};
