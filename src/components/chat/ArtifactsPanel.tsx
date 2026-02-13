import { X, FileText, Download } from 'lucide-react';

interface Artifact {
  id: string;
  name: string;
  type: string;
  size?: string;
  createdAt: string;
}

interface ArtifactsPanelProps {
  artifacts: Artifact[];
  onClose: () => void;
  onDownload: (artifact: Artifact) => void;
}

export const ArtifactsPanel = ({ artifacts, onClose, onDownload }: ArtifactsPanelProps) => {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col rounded-lg border border-sky-100 bg-white shadow-sm h-full">
      <div className="flex items-center justify-between border-b border-sky-50 p-4">
        <h3 className="font-semibold text-ink-900 text-sm">生成产物</h3>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-900">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {artifacts.length === 0 ? (
          <div className="text-center text-sm text-ink-400 mt-10">
            暂无产物
          </div>
        ) : (
          artifacts.map((artifact) => (
            <div key={artifact.id} className="rounded-lg border border-sky-50 bg-sky-50/50 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-sky-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate" title={artifact.name}>
                      {artifact.name}
                    </p>
                    <p className="text-xs text-ink-400">
                      {artifact.size || '未知大小'} • {new Date(artifact.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onDownload(artifact)}
                  className="text-ink-400 hover:text-sky-600 flex-shrink-0 ml-2"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
