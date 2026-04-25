import React from 'react';
import { BookOpen, FileSpreadsheet, PackagePlus, AlertCircle, ArrowRightLeft, Sliders, Printer } from 'lucide-react';

const HelpGuide = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-100">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Guide</h1>
            <p className="text-gray-500">Learn how to use InventoryFlow effectively</p>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Section 1: Initial Setup */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm mr-3">1</span>
              Getting Started & Setup
            </h2>
            <div className="pl-9 space-y-4 text-gray-600">
              <p>InventoryFlow connects to a Google Sheet to store your data. This ensures your data is secure, easily accessible, and exportable.</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 space-y-2">
                <p className="font-semibold flex items-center">
                  <AlertCircle size={16} className="mr-2" /> Google Sheet Integration Required
                </p>
                <p>To persist data across sessions, you must deploy the provided Google Apps Script and enter the Web App URL in the setup modal. If you skip this, data will only be stored locally and lost upon refresh.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Master List */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm mr-3">2</span>
              Master Inventory List
            </h2>
            <div className="pl-9 space-y-4 text-gray-600">
              <p>The Master List is where you manage your product catalog, locations, and low-stock alerts.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 flex items-center mb-2">
                    <FileSpreadsheet size={16} className="mr-2 text-emerald-600" /> Excel Import/Export
                  </h4>
                  <p className="text-sm">You can bulk import items using Excel. The first row should contain headers: <code className="bg-gray-100 px-1 rounded">Code</code>, <code className="bg-gray-100 px-1 rounded">Name</code>, <code className="bg-gray-100 px-1 rounded">Category</code>.</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 flex items-center mb-2">
                    <Printer size={16} className="mr-2 text-purple-600" /> Barcodes & Locations
                  </h4>
                  <p className="text-sm">Assign a "Location" to an item to generate a location barcode. Use "Print" to generate a PDF of location labels, or "Bulk Locations" to upload locations via Excel using columns: <code className="bg-gray-100 px-1 rounded">Item Code</code>, <code className="bg-gray-100 px-1 rounded">Location</code>.</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 flex items-center mb-2">
                    <Sliders size={16} className="mr-2 text-yellow-600" /> Stock Adjustments
                  </h4>
                  <p className="text-sm">Use the Adjust button to manually correct stock counts (e.g., after an audit). You can also perform Bulk Adjustments using an Excel file with columns: <code className="bg-gray-100 px-1 rounded">Item Code</code>, <code className="bg-gray-100 px-1 rounded">New Quantity</code>, <code className="bg-gray-100 px-1 rounded">Reason</code>.</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 flex items-center mb-2">
                    <AlertCircle size={16} className="mr-2 text-red-500" /> Min/Max Limits
                  </h4>
                  <p className="text-sm">Set Min/Max stock limits to get visual alerts. Use the "Bulk Limits" button to upload an Excel file with: <code className="bg-gray-100 px-1 rounded">Item Code</code>, <code className="bg-gray-100 px-1 rounded">Min Stock</code>, <code className="bg-gray-100 px-1 rounded">Max Stock</code>.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Inward & Outward */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm mr-3">3</span>
              Inward & Outward Tracking
            </h2>
            <div className="pl-9 space-y-4 text-gray-600">
              <p>Record stock movement to keep an accurate log of where inventory is coming from and going to.</p>
              
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Inward (Receiving):</strong> Record stock entering the system. You must provide a source/supplier name. The searchable dropdown supports keyboard navigation (Up/Down/Enter).</li>
                <li><strong>Outward (Dispatch):</strong> Record stock leaving the system. You must provide a destination/party name. You cannot dispatch more stock than is currently available.</li>
                <li><strong>Bulk Operations:</strong> Both Inward and Outward support bulk uploads via Excel. Ensure columns match the required format (Code, Quantity, Party Name).</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Bill of Materials */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm mr-3">4</span>
              Bill of Materials (BOM) & Manufacturing
            </h2>
            <div className="pl-9 space-y-4 text-gray-600">
              <p>For manufacturing setups, you can define recipes (BOMs) for Finished Goods (FG).</p>
              
              <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-4 text-sm mt-2">
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Navigate to the BOM section and click "Create New BOM".</li>
                  <li>Select the Finished Good item.</li>
                  <li>Add Raw Materials (RM) and the exact quantities required to produce <strong>one unit</strong> of the FG.</li>
                  <li>To manufacture, use the "Execute BOM" button, enter the number of FG units produced. The system will automatically INWARD the FG and OUTWARD the required raw materials based on the recipe.</li>
                </ol>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default HelpGuide;
