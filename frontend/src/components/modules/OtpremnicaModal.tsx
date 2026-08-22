import React from 'react';
import { Modal } from '../common/Modal';
import { useLanguageStore } from '../../store/useLanguageStore';
import { OtpremnicaDocument } from '../../types';
import { exportOtpremnicaPDF } from '../../utils/pdfReportGenerator';
import { Printer, Download, FileCheck, User, FolderKanban, Calendar, FileText } from 'lucide-react';

interface OtpremnicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  otpremnica: OtpremnicaDocument | null;
}

export const OtpremnicaModal: React.FC<OtpremnicaModalProps> = ({
  isOpen,
  onClose,
  otpremnica,
}) => {
  const { t } = useLanguageStore();

  if (!otpremnica) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    exportOtpremnicaPDF(otpremnica);
  };

  const items = otpremnica.items || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('Otpremnica')} / ${t('Equipment Handover Receipt')}: ${otpremnica.documentNumber}`}>
      <div className="space-y-5 text-xs">

        {/* Action Header */}
        <div className="flex items-center justify-between bg-surface-50 p-3 rounded-lg border border-surface-200 no-print">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <FileCheck className="w-4 h-4 text-brand-600" />
            <span>{t('Handover Receipt Document')} ({otpremnica.documentNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white hover:bg-surface-100 text-slate-700 border border-surface-200 rounded font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('Print Document')}</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Download PDF')}</span>
            </button>
          </div>
        </div>

        {/* Printable Document A4 Container */}
        <div id="printable-document" className="bg-white p-6 border border-surface-200 rounded-xl shadow-sm space-y-6">

          {/* Document Banner */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Enterprise Warehouse System</span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">{t('OTPREMNICA')} / {t('EQUIPMENT HANDOVER RECEIPT')}</h1>
              <p className="text-[11px] text-slate-500">{t('Official digital loan custody & equipment issue agreement')}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded border border-brand-200 inline-block">
                {otpremnica.documentNumber}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">{t('Date:')} {otpremnica.issueDate}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                <span className="text-slate-500 font-medium">{t('Employee / Recipient:')}</span>
                <span className="font-bold text-slate-800">{otpremnica.employeeName || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-brand-600" />
                <span className="text-slate-500 font-medium">{t('Department:')}</span>
                <span className="font-semibold text-slate-800">{otpremnica.employeeDepartment || 'Field Operations'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-purple-600" />
                <span className="text-slate-500 font-medium">{t('Project / Job Site:')}</span>
                <span className="font-bold text-slate-800">
                  {otpremnica.projectName ? `${otpremnica.projectName} (${otpremnica.projectCode || ''})` : t('General Stock Issue')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-500 font-medium">{t('Issuer / Warehouse Rep:')}</span>
                <span className="font-semibold text-slate-800">{otpremnica.createdByName || 'Warehouse Manager'}</span>
              </div>
            </div>
          </div>

          {/* Asset List Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>{t('Issued Assets & Equipment List')} ({items.length})</span>
            </h3>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
                  <th className="px-3 py-2 border-r border-slate-200">{t('Asset Code')}</th>
                  <th className="px-3 py-2 border-r border-slate-200">{t('Name')}</th>
                  <th className="px-3 py-2 border-r border-slate-200">{t('Serial Number')}</th>
                  <th className="px-3 py-2 border-r border-slate-200">{t('Category')}</th>
                  <th className="px-3 py-2 text-right">{t('Quantity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-400">
                      {t('No items listed on this handover receipt')}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-brand-600 border-r border-slate-200">{item.assetNumber}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">{item.assetName}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 border-r border-slate-200">{item.serialNumber || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{item.category}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">{item.quantity || 1}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Legal Acknowledgement */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 italic">
            {t('Potvrđujem da sam gore navedenu opremu preuzeo u ispravnom stanju i preuzimam punu materijalnu odgovornost.')}
          </div>

          {/* Signatures Section */}
          <div className="grid grid-cols-2 gap-8 pt-8">
            <div className="space-y-8">
              <div>
                <p className="font-bold text-slate-700 text-xs">{t('Potpis Preuzimaoca / Employee Signature:')}</p>
                <div className="mt-8 border-b-2 border-slate-400 w-full"></div>
                <p className="text-[11px] text-slate-500 mt-1">{otpremnica.employeeName || t('Zaposlenik')}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <p className="font-bold text-slate-700 text-xs">{t('Izdavalac Skladište / Warehouse Representative:')}</p>
                <div className="mt-8 border-b-2 border-slate-400 w-full"></div>
                <p className="text-[11px] text-slate-500 mt-1">{otpremnica.createdByName || t('Skladištar')}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-slate-500 text-[11px]">
            {t('Datum / Date:')} ____________________________
          </div>

        </div>

      </div>
    </Modal>
  );
};
