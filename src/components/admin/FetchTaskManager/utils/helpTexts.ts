/**
 * 帮助文本工具函数
 */

import { PARAM_HELP_TEXT } from "../constants";

export const getFieldHelpText = (fieldName: string) => 
  PARAM_HELP_TEXT[fieldName] ?? "该字段由后端 catalog 定义，当前前端没有更细的内置说明。";
