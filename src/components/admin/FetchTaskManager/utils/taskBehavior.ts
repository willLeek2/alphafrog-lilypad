/**
 * 任务行为描述工具函数
 */

import { getTaskKindLabel, formatJson } from "./formatters";
import { readTaskFieldValue } from "./taskParams";

export const summarizeTaskBehavior = (taskName: string, taskSubType: number) => {
  switch (taskName) {
    case "stock_daily":
      if (taskSubType === 1) {
        return "按单个交易日抓取全市场股票日线。";
      }
      if (taskSubType === 3) {
        return "按日期范围批量抓取全市场股票日线，偏历史初始化。";
      }
      break;
    case "index_daily_basic":
      if (taskSubType === 1) {
        return "按指数代码加日期范围抓取指数估值指标。";
      }
      if (taskSubType === 2) {
        return "按单个交易日抓取当日全部指数估值指标。";
      }
      if (taskSubType === 3) {
        return "按日期范围批量抓取全部指数估值指标，偏历史初始化。";
      }
      break;
    case "sw_industry_daily":
      if (taskSubType === 1) {
        return "按单个交易日抓取当日全部申万行业日线。";
      }
      if (taskSubType === 2) {
        return "按行业指数代码加日期范围抓取申万行业日线。";
      }
      if (taskSubType === 3) {
        return "按日期范围批量抓取全部申万行业日线，偏历史初始化。";
      }
      break;
    case "fund_nav":
      return "按单个交易日抓取全部基金净值。";
    case "fund_manager":
      return "按过滤条件抓取基金经理信息，也可以不加业务过滤直接分页扫全量。";
    case "fund_share":
      return taskSubType === 3
        ? "按日期范围批量抓取基金份额。"
        : "按单个交易日或筛选条件抓取基金份额。";
    case "etf_share_size":
      return taskSubType === 3
        ? "按日期范围批量抓取 ETF 份额规模。"
        : "按单个交易日或筛选条件抓取 ETF 份额规模。";
    case "sw_industry_classify":
      return "抓取申万行业分类，不填条件时走默认分类体系。";
    case "sw_industry_member":
      return "按行业编码、成分代码等过滤抓取申万行业成分，也可直接分页扫全量。";
    case "ci_index_member":
      return "按行业编码、成分代码等过滤抓取中信行业成分，也可直接分页扫全量。";
    default:
      return `抓取 ${getTaskKindLabel(taskName)} 数据。`;
  }
  return `抓取 ${getTaskKindLabel(taskName)} 数据。`;
};

export const describeLeafRequest = (taskName: string, taskSubType: number, params: Record<string, unknown>) => {
  const offset = readTaskFieldValue(params, "offset");
  const limit = readTaskFieldValue(params, "limit");

  switch (taskName) {
    case "stock_daily":
      if (taskSubType === 1) {
        return `按交易日 ${readTaskFieldValue(params, "trade_date_timestamp")} 抓取全市场股票日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取全市场股票日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      break;
    case "index_daily_basic":
      if (taskSubType === 1) {
        return `按指数代码 ${readTaskFieldValue(params, "ts_code")} 抓取 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 的指数估值指标，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 2) {
        return `按交易日 ${readTaskFieldValue(params, "trade_date")} 抓取当日全部指数估值指标，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取全部指数估值指标，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      break;
    case "sw_industry_daily":
      if (taskSubType === 1) {
        return `按交易日 ${readTaskFieldValue(params, "trade_date")} 抓取当日全部申万行业日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 2) {
        return `按行业指数代码 ${readTaskFieldValue(params, "ts_code")} 抓取 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 的申万行业日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取全部申万行业日线，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      break;
    case "fund_nav":
      return `按交易日 ${readTaskFieldValue(params, "trade_date_timestamp")} 抓取全部基金净值，分页参数为 offset=${offset}、limit=${limit}。`;
    case "fund_share":
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取基金份额，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      return `按 trade_date=${readTaskFieldValue(params, "trade_date")}、ts_code=${readTaskFieldValue(params, "ts_code")}、market=${readTaskFieldValue(params, "market")} 等条件抓取基金份额，分页参数为 offset=${offset}、limit=${limit}。`;
    case "etf_share_size":
      if (taskSubType === 3) {
        return `按日期范围 ${readTaskFieldValue(params, "start_date")} 到 ${readTaskFieldValue(params, "end_date")} 抓取 ETF 份额规模，分页参数为 offset=${offset}、limit=${limit}。`;
      }
      return `按 trade_date=${readTaskFieldValue(params, "trade_date")}、ts_code=${readTaskFieldValue(params, "ts_code")}、exchange=${readTaskFieldValue(params, "exchange")} 等条件抓取 ETF 份额规模，分页参数为 offset=${offset}、limit=${limit}。`;
    case "fund_manager":
      return `按 ts_code=${readTaskFieldValue(params, "ts_code")}、ann_date=${readTaskFieldValue(params, "ann_date")}、name=${readTaskFieldValue(params, "name")} 等条件抓取基金经理，分页参数为 offset=${offset}、limit=${limit}。`;
    case "sw_industry_member":
      return `按 l1/l2/l3/ts_code/is_new 等条件抓取申万行业成分，当前参数为 l1_code=${readTaskFieldValue(params, "l1_code")}、l2_code=${readTaskFieldValue(params, "l2_code")}、l3_code=${readTaskFieldValue(params, "l3_code")}、ts_code=${readTaskFieldValue(params, "ts_code")}、is_new=${readTaskFieldValue(params, "is_new")}，分页参数为 offset=${offset}、limit=${limit}。`;
    case "ci_index_member":
      return `按 l1/l2/l3/ts_code/is_new 等条件抓取中信行业成分，当前参数为 l1_code=${readTaskFieldValue(params, "l1_code")}、l2_code=${readTaskFieldValue(params, "l2_code")}、l3_code=${readTaskFieldValue(params, "l3_code")}、ts_code=${readTaskFieldValue(params, "ts_code")}、is_new=${readTaskFieldValue(params, "is_new")}，分页参数为 offset=${offset}、limit=${limit}。`;
    case "sw_industry_classify":
      return `抓取申万行业分类，当前参数为 level=${readTaskFieldValue(params, "level")}、src=${readTaskFieldValue(params, "src")}。`;
    default:
      return `抓取 ${getTaskKindLabel(taskName)}，请求参数为 ${formatJson(params)}。`;
  }
  return `抓取 ${getTaskKindLabel(taskName)}，请求参数为 ${formatJson(params)}。`;
};
