import React, { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2,
  XCircle, ArrowRight, Printer, RefreshCw, X, AlertCircle, Loader2
} from 'lucide-react';
import { Asset } from '../../types';
import {
  downloadAssetExcelTemplate,
  parseAssetExcelFile,
  validateAssetRows,
  exportFailedRowsToExcel,
  ValidatedImportRow,
  RawImportRow,
} from '../../utils/assetExcelTemplate';
import { apiFetch } from '../../lib/apiClient';

interface AssetImportModalProps {
  existingAssets: Asset[];
  onClose: () => void;
  onImportComplete: (importedAssets: Asset[]) => void;
  onOpenBulkQRPrint: (assets: Asset[]) => void;
}

export const AssetImportModal: React.FC<AssetImportModalProps> = ({
  existingAssets,
  onClose,
  onImportComplete,
  onOpenBulkQRPrint,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');
  const [isDragging, setIsDragging] = useState(false);
  const [importResults, setImportResults] = useState<{
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    importedAssets: Asset[];
    errors: Array<{ row: number; assetNumber?: string; error: string }>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (selectedFile: File) => {
    try {
      setErrorMessage(null);
      const rows = await parseAssetExcelFile(selectedFile);
      if (rows.length === 0) {
        setErrorMessage('The uploaded file does not contain any asset rows.');
        return;
      }
      setFile(selectedFile);
      setRawRows(rows);
      const validated = validateAssetRows(rows, existingAssets, updateDuplicates);
      setValidatedRows(validated);
      setStep('preview');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Failed to parse Excel file. Please ensure it matches the template format.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDuplicateToggle = (newVal: boolean) => {
    setUpdateDuplicates(newVal);
    if (rawRows.length > 0) {
      const revalidated = validateAssetRows(rawRows, existingAssets, newVal);
      setValidatedRows(revalidated);
    }
  };

  const validCount = validatedRows.filter((r) => r.status === 'VALID').length;
  const warningCount = validatedRows.filter((r) => r.status === 'WARNING').length;
  const errorCount = validatedRows.filter((r) => r.status === 'ERROR').length;
  const importableCount = validCount + warningCount;

  const filteredRows = validatedRows.filter((r) => {
    if (filterMode === 'VALID') return r.status === 'VALID';
    if (filterMode === 'WARNING') return r.status === 'WARNING';
    if (filterMode === 'ERROR') return r.status === 'ERROR';
    return true;
  });

  const handleExecuteImport = async () => {
    const importableItems = validatedRows
      .filter((r) => r.status === 'VALID' || r.status === 'WARNING')
      .map((r) => r.data);

    if (importableItems.length === 0) {
      setErrorMessage('No valid rows available to import.');
      return;
    }

    setStep('importing');
    setErrorMessage(null);

    try {
      const response = await apiFetch<any>('/assets/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          assets: importableItems,
          updateDuplicates,
        }),
      });

      setImportResults(response);
      setStep('results');
      if (response.importedAssets && response.importedAssets.length > 0) {
        onImportComplete(response.importedAssets);
      }
    } catch (err: any) {
      console.error('Import execution error:', err);
      setErrorMessage(err.message || 'Failed to complete bulk import.');
      setStep('preview');
    }
  };

  const handleExportErrors = () => {
    const failed = validatedRows.filter((r) => r.status === 'ERROR');
    exportFailedRowsToExcel(failed);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk Import Assets</h3>
              <p className="text-xs text-slate-400">
                Upload existing inventory via Excel (.xlsx) or CSV with automatic QR code generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadAssetExcelTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
              title="Download pre-formatted Excel template"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>Download Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="px-6 py-3 bg-red-950/50 border-b border-red-800 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-slate-700 hover:border-brand-400 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="w-16 h-16 bg-brand-500/10 text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-500/20 shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>

                <h4 className="text-base font-semibold text-white mb-1">
                  Choose Excel file or drag & drop here
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Supports Microsoft Excel (.xlsx, .xls) and standard CSV files. All imported assets will automatically receive a unique QR code tag.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-glow">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Browse Spreadsheet</span>
                </div>
              </div>

              {/* Template notice card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white">Automated QR Generation Notice</p>
                  <p className="text-slate-400">
                    QR codes are strictly system-generated. Do not include a "QR Code" column in your Excel spreadsheet—the system automatically creates unique QR tags upon commit.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={downloadAssetExcelTemplate}
                      className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download the official template to see sample data</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Stats & Options Toolbar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setFilterMode('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        filterMode === 'ALL'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({validatedRows.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('VALID')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        filterMode === 'VALID'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Valid ({validCount})</span>
                    </button>
                    <button
                      onClick={() => setFilterMode('WARNING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        filterMode === 'WARNING'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-950/40 text-amber-400 hover:bg-amber-900/50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Warnings ({warningCount})</span>
                    </button>
                    <button
                      onClick={() => setFilterMode('ERROR')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        filterMode === 'ERROR'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/50'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Errors ({errorCount})</span>
                    </button>
                  </div>
                </div>

                {/* Duplicate overwrite toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    <input
                      type="checkbox"
                      checked={updateDuplicates}
                      onChange={(e) => handleDuplicateToggle(e.target.checked)}
                      className="rounded border-slate-600 text-brand-600 focus:ring-brand-500 w-4 h-4 bg-slate-900"
                    />
                    <span>Update existing assets if Asset Number matches</span>
                  </label>

                  {errorCount > 0 && (
                    <button
                      onClick={handleExportErrors}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-medium transition-colors"
                      title="Export rows with validation errors to fix in Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Error Rows</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/90 shadow-inner max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800/80 sticky top-0 z-10 text-slate-300 border-b border-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-14">Row</th>
                      <th className="py-2.5 px-3 w-24">Status</th>
                      <th className="py-2.5 px-3">Asset Name</th>
                      <th className="py-2.5 px-3">Asset #</th>
                      <th className="py-2.5 px-3">Serial #</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Issues / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-slate-500">
                          No rows matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const isErr = row.status === 'ERROR';
                        const isWarn = row.status === 'WARNING';
                        return (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${
                              isErr
                                ? 'bg-rose-950/20 hover:bg-rose-950/30'
                                : isWarn
                                ? 'bg-amber-950/20 hover:bg-amber-950/30'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-slate-400">{row.rowNumber}</td>
                            <td className="py-2 px-3">
                              {isErr ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  <XCircle className="w-3 h-3" /> Error
                                </span>
                              ) : isWarn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Warning
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium text-white max-w-[150px] truncate" title={row.data.name}>
                              {row.data.name || <span className="text-rose-400 italic">Empty</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300">{row.data.assetNumber || '-'}</td>
                            <td className="py-2 px-3 font-mono text-slate-300">{row.data.serialNumber || '-'}</td>
                            <td className="py-2 px-3 text-slate-300">{row.data.category || '-'}</td>
                            <td className="py-2 px-3 text-slate-300">{row.data.location || '-'}</td>
                            <td className="py-2 px-3">
                              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {row.data.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300">${row.data.purchasePrice}</td>
                            <td className="py-2 px-3 text-[11px]">
                              {row.messages.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {row.messages.map((m, idx) => (
                                    <li
                                      key={idx}
                                      className={isErr ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-slate-400'}
                                    >
                                      {m}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-slate-500">Ready to import</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING SPINNER */}
          {step === 'importing' && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
              <div>
                <h4 className="text-base font-bold text-white">Importing Assets & Generating QR Tags</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Writing records to the database and generating unique identifiers...
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: RESULTS */}
          {step === 'results' && importResults && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">New Assets Created</p>
                  <p className="text-3xl font-extrabold text-emerald-300 mt-1">{importResults.importedCount}</p>
                </div>
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Existing Assets Updated</p>
                  <p className="text-3xl font-extrabold text-amber-300 mt-1">{importResults.updatedCount}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Skipped / Failed</p>
                  <p className="text-3xl font-extrabold text-slate-300 mt-1">{importResults.skippedCount}</p>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-rose-950/20 border border-rose-800/50 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Server-side skipped items ({importResults.errors.length}):</span>
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-rose-300/80">
                    {importResults.errors.map((err, idx) => (
                      <p key={idx}>
                        Row {err.row}{err.assetNumber ? ` (${err.assetNumber})` : ''}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Code Bulk Generation Banner */}
              {importResults.importedAssets && importResults.importedAssets.length > 0 && (
                <div className="bg-brand-950/30 border border-brand-800/60 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-left">
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{importResults.importedAssets.length} Unique QR Tags Generated</span>
                    </h5>
                    <p className="text-xs text-slate-400">
                      All imported assets now have unique QR tags assigned. You can print them immediately in bulk.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onOpenBulkQRPrint(importResults.importedAssets);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs transition-all shadow-glow whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print All QR Labels</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setRawRows([]);
                  setValidatedRows([]);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Choose Another File
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={importableCount === 0}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Import {importableCount} Valid Row{importableCount !== 1 ? 's' : ''}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : step === 'results' ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
