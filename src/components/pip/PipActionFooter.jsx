import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { buildPipFooterActions } from "@/lib/ai/pip/footerActions";

export default function PipActionFooter({ result }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const actions = buildPipFooterActions(result);

  if (!actions.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
      {actions.map((action) => {
        if (action.disabled) {
          return (
            <button
              key={action.id}
              type="button"
              title={action.hint}
              onClick={() =>
                toast({
                  title: action.label,
                  description: action.hint || "Coming soon",
                })
              }
              className="rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-400"
            >
              {action.label}
            </button>
          );
        }

        if (action.href) {
          return (
            <Link
              key={action.id}
              to={action.href}
              state={action.state}
              className="rounded-lg border border-[#AFA9EC] bg-[#EEEDFE] px-3 py-1.5 text-[11px] font-medium text-[#534AB7] hover:bg-[#E0DEFC]"
            >
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => action.onClick?.(navigate)}
            className="rounded-lg border border-[#AFA9EC] bg-[#EEEDFE] px-3 py-1.5 text-[11px] font-medium text-[#534AB7]"
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
