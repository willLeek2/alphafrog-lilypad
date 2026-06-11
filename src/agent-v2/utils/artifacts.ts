import type { Artifact } from '../../api/agent';
import { getApiBaseUrl } from '../../utils/api';
import { loadAuth } from '../../utils/storage';

const HIDDEN_TYPE_PATTERNS = [/debug/i, /admin/i, /internal/i, /raw_trace/i];

export function isUserVisibleArtifact(artifact: Artifact): boolean {
  const type = artifact.type ?? '';
  const name = artifact.name ?? '';
  return !HIDDEN_TYPE_PATTERNS.some((p) => p.test(type) || p.test(name));
}

export function artifactDownloadHref(artifactId: string): string {
  const base = getApiBaseUrl();
  const auth = loadAuth();
  const token = auth?.token ?? '';
  return `${base}/api/agent/artifacts/${artifactId}/download?token=${encodeURIComponent(token)}`;
}
