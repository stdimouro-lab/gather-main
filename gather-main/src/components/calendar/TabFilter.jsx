import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye, EyeOff, Share2, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TAB_COLORS = {
  coral: { bg: 'bg-gradient-to-br from-rose-400 to-rose-600', light: 'bg-rose-100/80', text: 'text-rose-700', border: 'border-rose-200' },
  sky: { bg: 'bg-gradient-to-br from-sky-400 to-sky-600', light: 'bg-sky-100/80', text: 'text-sky-700', border: 'border-sky-200' },
  emerald: { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', light: 'bg-emerald-100/80', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { bg: 'bg-gradient-to-br from-amber-400 to-amber-600', light: 'bg-amber-100/80', text: 'text-amber-700', border: 'border-amber-200' },
  violet: { bg: 'bg-gradient-to-br from-violet-400 to-violet-600', light: 'bg-violet-100/80', text: 'text-violet-700', border: 'border-violet-200' },
  indigo: { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', light: 'bg-indigo-100/80', text: 'text-indigo-700', border: 'border-indigo-200' },
};

export function getTabColors(color) {
  return TAB_COLORS[color] || TAB_COLORS.indigo;
}

export default function TabFilter({ 
  tabs, 
  activeTabs, 
  onToggleTab, 
  onShareTab,
  onManageTab,
  sharedTabs = []
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tables</h3>
      </div>
      
      <div className="space-y-1">
        <AnimatePresence>
          {tabs.map((tab, index) => {
            const isActive = activeTabs.includes(tab.id);
            const colors = getTabColors(tab.color);
            const isShared = sharedTabs.some(s => s.tab_id === tab.id);
            
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                  isActive ? `${colors.light} ${colors.border} border shadow-sm` : "hover:bg-slate-50"
                )}
                onClick={() => onToggleTab(tab.id)}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  colors.bg,
                  !isActive && "opacity-30"
                )} />
                
                <span className={cn(
                  "flex-1 text-sm font-medium transition-colors",
                  isActive ? colors.text : "text-slate-400"
                )}>
                  {tab.name}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareTab(tab);
                    }}
                    title="Share table"
                  >
                    <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageTab(tab);
                    }}
                    title="Table settings"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </div>
                
                <motion.div
                  initial={false}
                  animate={{ scale: isActive ? 1 : 0 }}
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    colors.bg
                  )}
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {sharedTabs.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Invited Tables</h3>
          <div className="space-y-1">
            {sharedTabs.filter(s => s.accepted).map((share) => {
              const tab = tabs.find(t => t.id === share.tab_id);
              if (!tab) return null;
              const isActive = activeTabs.includes(tab.id);
              const colors = getTabColors(tab.color);
              
              return (
                <motion.div
                  key={share.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                    isActive ? `${colors.light} ${colors.border} border` : "hover:bg-slate-50"
                  )}
                  onClick={() => onToggleTab(tab.id)}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full transition-all",
                    colors.bg,
                    !isActive && "opacity-30"
                  )} />
                  <span className={cn(
                    "flex-1 text-sm font-medium",
                    isActive ? colors.text : "text-slate-400"
                  )}>
                    {tab.name}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{share.role}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}