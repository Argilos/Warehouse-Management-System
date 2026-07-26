import React from 'react';
import { useWarehouseStore } from './store/useWarehouseStore';

// Common Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { Modal } from './components/common/Modal';

// QR Print & 360 Profile Overlays
import { PrintableQRLabel } from './components/qr/PrintableQRLabel';
import { AssetPersonalCardModal } from './components/modules/AssetPersonalCardModal';

// 15 System Modules
import { DashboardModule } from './components/modules/DashboardModule';
import { AssetManagementModule } from './components/modules/AssetManagementModule';
import { QRScannerModule } from './components/modules/QRScannerModule';
import { ToolIssuingModule } from './components/modules/ToolIssuingModule';
import { ToolBoxModule } from './components/modules/ToolBoxModule';
import { MaintenanceModule } from './components/modules/MaintenanceModule';
import { CalibrationModule } from './components/modules/CalibrationModule';
import { EmployeeModule } from './components/modules/EmployeeModule';
import { SupplierModule } from './components/modules/SupplierModule';
import { ProjectModule } from './components/modules/ProjectModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { UserManagementModule } from './components/modules/UserManagementModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { AuditLogModule } from './components/modules/AuditLogModule';

export function App() {
  const { 
    activeModule, selectedAssetFor360, setSelectedAssetFor360, 
    selectedAssetForQRLabel, setSelectedAssetForQRLabel,
    fetchInitialData
  } = useWarehouseStore();

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'assets':
        return <AssetManagementModule />;
      case 'qr-scan':
        return <QRScannerModule />;
      case 'issuing':
        return <ToolIssuingModule />;
      case 'toolboxes':
        return <ToolBoxModule />;
      case 'maintenance':
        return <MaintenanceModule />;
      case 'calibration':
        return <CalibrationModule />;
      case 'employees':
        return <EmployeeModule />;
      case 'suppliers':
        return <SupplierModule />;
      case 'projects':
        return <ProjectModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'reports':
        return <ReportsModule />;
      case 'users':
        return <UserManagementModule />;
      case 'settings':
        return <SettingsModule />;
      case 'audit-logs':
        return <AuditLogModule />;
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 text-slate-800 selection:bg-brand-200 selection:text-brand-900">
      
      {/* Global Application Header & Role Switcher */}
      <Header />

      {/* Main Content Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 gap-5">
        
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Module Content Viewport */}
        <main className="flex-1 overflow-x-hidden min-w-0">
          {renderActiveModule()}
        </main>

      </div>

      {/* Global Application Footer */}
      <Footer />

      {/* Global 360 Asset Profile Modal */}
      <AssetPersonalCardModal
        asset={selectedAssetFor360}
        onClose={() => setSelectedAssetFor360(null)}
      />

      {/* Global Printable QR Label Tag Drawer Modal */}
      {selectedAssetForQRLabel && (
        <Modal
          isOpen={!!selectedAssetForQRLabel}
          onClose={() => setSelectedAssetForQRLabel(null)}
          title="Print Asset QR Code Tag"
          maxWidth="max-w-md"
        >
          <PrintableQRLabel
            asset={selectedAssetForQRLabel}
            onClose={() => setSelectedAssetForQRLabel(null)}
          />
        </Modal>
      )}

    </div>
  );
}

export default App;
