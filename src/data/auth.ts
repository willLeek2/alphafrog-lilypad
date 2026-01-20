import type { Permission } from "../types/auth";

export const defaultPermissions: Permission[] = [
  { id: "session.jwt", label: "JWT authenticated session" },
  { id: "gateway.access", label: "API gateway access (authenticated)" },
  { id: "tasks.create", label: "Task creation endpoints (when enabled)" },
  { id: "portfolio.read", label: "Portfolio data access (policy-based)" },
];
