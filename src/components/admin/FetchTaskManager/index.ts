/**
 * FetchTaskManager 组件的模块入口
 * 
 * 为了减小主文件大小，已将以下内容拆分到独立文件：
 * - types.ts: 所有 TypeScript 类型定义
 * - constants.ts: 所有常量定义（下拉选项、帮助文案、状态元数据等）
 * - utils/dates.ts: 日期相关工具函数
 * 
 * 后续可继续拆分：
 * - utils/formatters.ts: 格式化工具
 * - utils/taskParams.ts: 任务参数工具
 * - utils/catalog.ts: 目录查询工具
 * - utils/draft.ts: 草稿创建工具
 * - utils/payload.ts: 载荷构建工具
 * - utils/preview.ts: 预览相关工具
 */

export * from "./types";
export * from "./constants";
export * from "./utils/dates";
