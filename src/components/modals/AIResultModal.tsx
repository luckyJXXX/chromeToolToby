import { Sparkles } from 'lucide-react';
import { AIAnalysisResult } from '../../services/ai';

interface AIResultModalProps {
  isOpen: boolean;
  result: AIAnalysisResult | null;
  onClose: () => void;
  onApply: () => void;
}

export default function AIResultModal({ isOpen, result, onClose, onApply }: AIResultModalProps) {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-[480px] border border-dark-700 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-indigo-400" />
          <h3 className="text-lg font-medium text-dark-100">AI 分析结果</h3>
        </div>

        {result.title && (
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">建议标题</label>
            <p className="text-dark-100 bg-dark-700 rounded-lg px-3 py-2">{result.title}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-dark-400 mb-1">内容摘要</label>
          <p className="text-dark-100 bg-dark-700 rounded-lg px-3 py-2 text-sm leading-relaxed">
            {result.summary}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-dark-400 mb-1">关键词</label>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-indigo-600/30 text-indigo-300 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-dark-400 mb-1">分类</label>
          <span className="inline-flex items-center px-2 py-1 bg-purple-600/30 text-purple-300 text-sm rounded-lg">
            {result.category}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
          >
            关闭
          </button>
          <button
            onClick={onApply}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
          >
            同步到描述
          </button>
        </div>
      </div>
    </div>
  );
}
