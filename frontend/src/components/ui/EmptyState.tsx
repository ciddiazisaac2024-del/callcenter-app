import { LucideIcon } from 'lucide-react';

interface Props {
  icon:    LucideIcon;
  title:   string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, action }: Props) {
  return (
    <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
      <Icon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
      <p className="text-slate-500">{title}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-blue-400 hover:text-blue-300 text-sm underline"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
