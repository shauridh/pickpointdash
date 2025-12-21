
import React, { useState, useEffect, useRef } from 'react';
import { User, Package, PackageSize, Customer } from '../types';
import { StorageService } from '../services/storage';
import { PricingService } from '../services/pricing';
import { COURIER_OPTIONS } from '../constants';
import { WhatsAppService } from '../services/whatsapp';
import { Search, Plus, QrCode, X, Truck, MessageCircle, Trash2, Camera, CheckCircle, Package as PackageIcon, Scan } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import BarcodeScanner from './BarcodeScanner';
import QRScanner from './QRScanner';

interface PackagesProps {
  user: User;
}

const generatePickupCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const Packages: React.FC<PackagesProps> = ({ user }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  
  // Data for Form
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Add Form State
  const [formData, setFormData] = useState({
    tracking: '',
    recipientName: '',
    recipientPhone: '',
    unitNumber: '',
    courier: COURIER_OPTIONS[0],
    size: 'M' as PackageSize,
    locationId: user.role === 'STAFF' ? user.locationId! : '',
    photo: ''
  });

  const loadData = () => {
    setPackages(StorageService.getPackages());
    setCustomers(StorageService.getCustomers());
    setLocations(StorageService.getLocations());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, []);

  const filteredPackages = packages.filter(p => {
    const matchesTab = activeTab === 'ACTIVE' ? p.status === 'ARRIVED' : p.status !== 'ARRIVED';
    const matchesSearch = p.trackingNumber.toLowerCase().includes(search.toLowerCase()) || 
                          p.recipientName.toLowerCase().includes(search.toLowerCase()) ||
                          p.unitNumber.toLowerCase().includes(search.toLowerCase());
    const matchesLoc = user.role === 'STAFF' ? p.locationId === user.locationId : true;
    return matchesTab && matchesSearch && matchesLoc;
  }).sort((a,b) => new Date(b.dates.arrived).getTime() - new Date(a.dates.arrived).getTime());

  const handleCustomerSearch = (val: string, field: 'name' | 'unit') => {
    if (field === 'name') setFormData({ ...formData, recipientName: val });
    else setFormData({ ...formData, unitNumber: val });

    // Auto-fill logic
    const found = customers.find(c => 
      (field === 'name' && c.name.toLowerCase() === val.toLowerCase()) ||
      (field === 'unit' && c.unitNumber.toLowerCase() === val.toLowerCase())
    );

    if (found) {
      setFormData(prev => ({
        ...prev,
        recipientName: found.name,
        recipientPhone: found.phoneNumber,
        unitNumber: found.unitNumber
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId) return alert("Select Location");

    const newPkg: Package = {
      id: `pkg_${Date.now()}`,
      trackingNumber: formData.tracking,
      recipientName: formData.recipientName,
      recipientPhone: formData.recipientPhone,
      unitNumber: formData.unitNumber,
      courier: formData.courier,
      size: formData.size,
      locationId: formData.locationId,
      status: 'ARRIVED',
      dates: { arrived: new Date().toISOString() },
      pickupCode: generatePickupCode(),
      feePaid: 0,
      photo: formData.photo,
      notificationStatus: 'PENDING'
    };

    StorageService.savePackage(newPkg);
    
    // Trigger WA
    const loc = locations.find(l => l.id === newPkg.locationId);
    if (loc) {
      const settings = StorageService.getSettings();
      WhatsAppService.sendNotification(newPkg, loc, settings);
    }

    setIsAddModalOpen(false);
    setFormData({ ...formData, tracking: '', recipientName: '', recipientPhone: '', unitNumber: '', photo: '' });
    loadData();
  };

  const handlePickup = (pkg: Package) => {
    const loc = locations.find(l => l.id === pkg.locationId);
    const cust = customers.find(c => c.phoneNumber === pkg.recipientPhone); // simplistic matching
    if (!loc) return;

    const fee = PricingService.calculateFee(pkg, loc, cust);
    
    if (confirm(`Confirm Pickup?\nFee to pay: Rp ${fee.toLocaleString()}`)) {
      const updated: Package = {
        ...pkg,
        status: 'PICKED',
        dates: { ...pkg.dates, picked: new Date().toISOString() },
        feePaid: fee
      };
      StorageService.savePackage(updated);
      setSelectedPkg(null);
      loadData();
    }
  };

  const handleDestroy = (pkg: Package) => {
    if (confirm("Are you sure you want to mark this as DESTROYED/LOST?")) {
      const updated: Package = {
        ...pkg,
        status: 'DESTROYED',
        dates: { ...pkg.dates, destroyed: new Date().toISOString() },
      };
      StorageService.savePackage(updated);
      setSelectedPkg(null);
      loadData();
    }
  };

  // Mock Camera Input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, photo: ev.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  
  const handleScan = (code: string) => {
    setFormData({...formData, tracking: code});
    setIsScannerOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 w-fit">
          <button onClick={() => setActiveTab('ACTIVE')} className={twMerge("px-4 py-2 text-sm font-medium rounded-md", activeTab === 'ACTIVE' ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50")}>Active Inventory</button>
          <button onClick={() => setActiveTab('HISTORY')} className={twMerge("px-4 py-2 text-sm font-medium rounded-md", activeTab === 'HISTORY' ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50")}>History</button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search AWB / Unit / Name" 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsQRScannerOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              <Scan className="w-4 h-4" /> Scan QR
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Receive Package
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Tracking / Courier</th>
              <th className="px-6 py-4 font-semibold">Recipient</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPackages.map(pkg => (
              <tr key={pkg.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedPkg(pkg)}>
                <td className="px-6 py-4">
                  <div className="font-mono text-slate-900 font-medium">{pkg.trackingNumber}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Truck className="w-3 h-3" /> {pkg.courier} • Size {pkg.size}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{pkg.recipientName}</div>
                  <div className="text-xs text-slate-500 bg-slate-100 w-fit px-1.5 py-0.5 rounded mt-1">Unit {pkg.unitNumber}</div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(pkg.dates.arrived).toLocaleDateString()}
                  <div className="text-xs">{new Date(pkg.dates.arrived).toLocaleTimeString()}</div>
                </td>
                <td className="px-6 py-4">
                   <span className={twMerge(
                     "px-2.5 py-1 rounded-full text-xs font-semibold",
                     pkg.status === 'ARRIVED' ? "bg-blue-50 text-blue-600" :
                     pkg.status === 'PICKED' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                   )}>
                     {pkg.status}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">View</button>
                </td>
              </tr>
            ))}
            {filteredPackages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No packages found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Receive New Package</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Tracking Number</label>
                   <div className="flex gap-2">
                     <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.tracking} onChange={e => setFormData({...formData, tracking: e.target.value})} placeholder="Scan or type..." />
                     <button type="button" onClick={() => setIsScannerOpen(true)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><QrCode className="w-5 h-5 text-slate-600" /></button>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1">Courier</label>
                     <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.courier} onChange={e => setFormData({...formData, courier: e.target.value})}>
                       {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1">Size</label>
                     <div className="flex bg-slate-100 rounded-lg p-1">
                       {(['S','M','L'] as const).map(s => (
                         <button type="button" key={s} onClick={() => setFormData({...formData, size: s})} className={twMerge("flex-1 text-xs py-1.5 rounded font-medium", formData.size === s ? "bg-white shadow text-blue-600" : "text-slate-500")}>{s}</button>
                       ))}
                     </div>
                   </div>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Package Photo</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg h-32 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       {formData.photo ? (
                         <img src={formData.photo} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                       ) : (
                         <>
                           <Camera className="w-6 h-6 mb-2" />
                           <span className="text-xs">Click to capture/upload</span>
                         </>
                       )}
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                 </div>
               </div>

               <div className="space-y-4">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <h4 className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wider">Recipient Details</h4>
                   <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">Unit Number</label>
                        <input className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" value={formData.unitNumber} onChange={e => handleCustomerSearch(e.target.value, 'unit')} placeholder="e.g. A-101" />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">Full Name</label>
                        <input className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" value={formData.recipientName} onChange={e => handleCustomerSearch(e.target.value, 'name')} placeholder="Recipient Name" />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">WhatsApp Number</label>
                        <input className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" value={formData.recipientPhone} onChange={e => setFormData({...formData, recipientPhone: e.target.value})} placeholder="628..." />
                      </div>
                   </div>
                 </div>

                 {user.role === 'ADMIN' && (
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                     <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                        <option value="">Select Location</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                     </select>
                   </div>
                 )}
               </div>

               <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-200">Save & Notify</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setSelectedPkg(null) }}>
           <div className="bg-white rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="relative h-40 bg-slate-200">
                {selectedPkg.photo ? (
                  <img src={selectedPkg.photo} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400"><PackageIcon className="w-12 h-12" /></div>
                )}
                <button onClick={() => setSelectedPkg(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-1 rounded-full"><X className="w-5 h-5" /></button>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                  {selectedPkg.trackingNumber}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedPkg.recipientName}</h2>
                    <p className="text-slate-500 text-sm">Unit {selectedPkg.unitNumber}</p>
                  </div>
                  <div className={twMerge("px-3 py-1 rounded-full text-xs font-bold", 
                    selectedPkg.status === 'ARRIVED' ? "bg-blue-100 text-blue-700" : 
                    selectedPkg.status === 'PICKED' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {selectedPkg.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-6">
                  <div>
                    <span className="block text-xs text-slate-400">Courier</span>
                    {selectedPkg.courier} ({selectedPkg.size})
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400">Arrived</span>
                    {new Date(selectedPkg.dates.arrived).toLocaleString()}
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400">Pickup Code</span>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedPkg.pickupCode ?? '—'}</span>
                  </div>
                  {selectedPkg.dates.picked && (
                    <div>
                      <span className="block text-xs text-slate-400">Picked Up</span>
                      {new Date(selectedPkg.dates.picked).toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Fee Calculation Preview if Arrived */}
                {selectedPkg.status === 'ARRIVED' && (() => {
                   const loc = locations.find(l => l.id === selectedPkg.locationId);
                   const cust = customers.find(c => c.phoneNumber === selectedPkg.recipientPhone);
                   const fee = loc ? PricingService.calculateFee(selectedPkg, loc, cust) : 0;
                   return (
                     <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6 flex justify-between items-center">
                       <div>
                         <p className="text-xs font-bold text-orange-800 uppercase">Current Fee</p>
                         <p className="text-orange-600 text-xs">{cust?.isMember ? "(Member Free)" : "(Storage Fee)"}</p>
                       </div>
                       <p className="text-2xl font-bold text-orange-700">Rp {fee.toLocaleString()}</p>
                     </div>
                   )
                })()}

                <div className="grid grid-cols-3 gap-2">
                   {selectedPkg.status === 'ARRIVED' && (
                     <>
                        <button onClick={() => handlePickup(selectedPkg)} className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Pickup Package</button>
                        <button onClick={() => {
                           const loc = locations.find(l => l.id === selectedPkg.locationId);
                           const settings = StorageService.getSettings();
                           if(loc) WhatsAppService.sendNotification(selectedPkg, loc, settings);
                           alert("Notification resent to queue!");
                        }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center"><MessageCircle className="w-4 h-4" /></button>
                     </>
                   )}
                   {selectedPkg.status !== 'DESTROYED' && selectedPkg.status !== 'PICKED' && (
                     <button onClick={() => handleDestroy(selectedPkg)} className="col-span-3 mt-2 text-red-500 hover:text-red-700 text-xs py-2 flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" /> Mark as Lost/Destroyed</button>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}
      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
      {isQRScannerOpen && (
        <QRScanner onClose={() => { setIsQRScannerOpen(false); loadData(); }} />
      )}
    </div>
  );
};

export default Packages;
