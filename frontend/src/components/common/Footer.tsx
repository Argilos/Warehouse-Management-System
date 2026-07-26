import React from 'react';
import { Mail, ShieldCheck, Warehouse } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-surface-200 text-slate-500 py-5 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: App Info */}
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-brand-600" />
          <span className="font-semibold text-slate-700">Enterprise Warehouse Asset Management Platform</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400 font-mono">v2.4.0-production</span>
        </div>

        {/* Center: Support Mailto */}
        <div className="flex items-center gap-4">
          <a
            href="mailto:support@warehouse-enterprise.com?subject=Warehouse%20System%20Support%20Request"
            className="flex items-center gap-1.5 text-slate-500 hover:text-brand-600 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>support@warehouse-enterprise.com</span>
          </a>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1 text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase RLS Protected</span>
          </div>
        </div>

        {/* Right: Copyright */}
        <div className="text-slate-400">
          © {new Date().getFullYear()} Enterprise Asset Control Inc. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
