
import React, { useState, useEffect } from 'react';
import { Location, PricingSchema, PricingType } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Trash2, Edit2, MapPin, Package, Settings, Truck, CreditCard, X } from 'lucide-react';
import config from '../config/environment';
import { twMerge } from 'tailwind-merge';

// --- HELPER COMPONENTS (Moved outside to prevent re-render focus loss) ---
const InputGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
  />
);
// -----------------------------------------------------------------------

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  useEffect(() => {
    setLocations(StorageService.getLocations());
  }, []);

  const handleSave = (loc: Location) => {
    StorageService.saveLocation(loc);
    setLocations(StorageService.getLocations());
    setEditingLoc(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this location?")) {
      StorageService.deleteLocation(id);
      setLocations(StorageService.getLocations());
    }
  };

  const createNew = () => {
    const newLoc: Location = {
      id: `loc_${Date.now()}`,
      name: 'New Location',
      pricing: { 
        type: 'FLAT', 
        gracePeriodDays: 0, // Default 0 as requested
        flatRate: 2000 
      },
      enableDelivery: false,
      deliveryFee: 0,
      enableMembership: false,
      membershipFee: 0
    };
    setEditingLoc(newLoc);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Locations & Pricing</h3>
          <p className="text-sm text-slate-500">Manage drop-off points and tariff schemas.</p>
        </div>
        <button onClick={createNew} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map(loc => (
          <div key={loc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                     <MapPin className="w-5 h-5" />
                   </div>
                   <div>
                     <h4 className="font-bold text-slate-800 text-sm">{loc.name}</h4>
                     <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wide">{loc.pricing.type}</span>
                       <span className="text-[10px] text-slate-400">• GP: {loc.pricing.gracePeriodDays}d</span>
                     </div>
                   </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingLoc(loc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(loc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
             </div>

             {/* Registration Form Link */}
             <div className="mb-3">
               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Form Link</label>
               <div className="flex items-center gap-2">
                 <input
                   type="text"
                   className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-600"
                   value={`https://${config.publicDomain}/form/${loc.id}`}
                   readOnly
                   onFocus={e => e.target.select()}
                 />
                 <button
                   type="button"
                   className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                   onClick={() => {
                     navigator.clipboard.writeText(`https://${config.publicDomain}/form/${loc.id}`);
                   }}
                 >Copy</button>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-50 pt-3">
               <div className={twMerge("flex items-center gap-2 p-2 rounded", loc.enableDelivery ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-400")}> 
                 <Truck className="w-3.5 h-3.5" />
                 <span className="font-medium">{loc.enableDelivery ? `Rp ${loc.deliveryFee.toLocaleString()}` : 'No Delivery'}</span>
               </div>
               <div className={twMerge("flex items-center gap-2 p-2 rounded", loc.enableMembership ? "bg-purple-50 text-purple-700" : "bg-slate-50 text-slate-400")}> 
                 <CreditCard className="w-3.5 h-3.5" />
                 <span className="font-medium">{loc.enableMembership ? `Rp ${loc.membershipFee.toLocaleString()}` : 'No Member'}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingLoc && (
        <LocationEditor 
          location={editingLoc} 
          onSave={handleSave} 
          onCancel={() => setEditingLoc(null)} 
        />
      )}
    </div>
  );
};

const LocationEditor = ({ location, onSave, onCancel }: { location: Location, onSave: (l: Location) => void, onCancel: () => void }) => {
  const [data, setData] = useState<Location>(location);

  const updatePricing = (field: keyof PricingSchema, val: any) => {
    setData(prev => ({ ...prev, pricing: { ...prev.pricing, [field]: val } }));
  };

  const handleInputChange = (field: keyof Location, val: any) => {
      setData(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            {data.id.includes('new') ? 'Create Location' : 'Edit Location'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Basic Info */}
          <InputGroup label="Location Name">
             <StyledInput value={data.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="e.g. Tower A Lobby" autoFocus />
          </InputGroup>

          {/* Section 2: Pricing Strategy */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-800">Pricing Engine</h4>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Schema Type">
                 <select 
                   className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                   value={data.pricing.type} 
                   onChange={e => updatePricing('type', e.target.value as PricingType)}
                 >
                   <option value="FLAT">Flat Rate (Rolling 24h)</option>
                   <option value="PROGRESSIVE">Progressive (Rolling 24h)</option>
                   <option value="SIZE">Size Based (Rolling 24h)</option>
                   <option value="QUANTITY">Quantity (Cal. Day)</option>
                 </select>
               </InputGroup>
               
               <InputGroup label="Grace Period (Days)">
                 <StyledInput type="number" min="0" value={data.pricing.gracePeriodDays} onChange={e => updatePricing('gracePeriodDays', parseInt(e.target.value) || 0)} />
               </InputGroup>
             </div>

             {/* Dynamic Pricing Fields */}
             <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                {data.pricing.type === 'FLAT' && (
                  <InputGroup label="Daily Rate (Rp)">
                     <StyledInput type="number" value={data.pricing.flatRate || 0} onChange={e => updatePricing('flatRate', parseInt(e.target.value))} />
                  </InputGroup>
                )}

                {data.pricing.type === 'PROGRESSIVE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="1st Day Rate">
                      <StyledInput type="number" value={data.pricing.firstDayRate || 0} onChange={e => updatePricing('firstDayRate', parseInt(e.target.value))} />
                    </InputGroup>
                    <InputGroup label="Next Day Rate">
                      <StyledInput type="number" value={data.pricing.nextDayRate || 0} onChange={e => updatePricing('nextDayRate', parseInt(e.target.value))} />
                    </InputGroup>
                  </div>
                )}

                {data.pricing.type === 'SIZE' && (
                   <div className="grid grid-cols-3 gap-3">
                     <InputGroup label="Small (S)">
                       <StyledInput type="number" value={data.pricing.sizeS||0} onChange={e=>updatePricing('sizeS', parseInt(e.target.value))} />
                     </InputGroup>
                     <InputGroup label="Medium (M)">
                       <StyledInput type="number" value={data.pricing.sizeM||0} onChange={e=>updatePricing('sizeM', parseInt(e.target.value))} />
                     </InputGroup>
                     <InputGroup label="Large (L)">
                       <StyledInput type="number" value={data.pricing.sizeL||0} onChange={e=>updatePricing('sizeL', parseInt(e.target.value))} />
                     </InputGroup>
                   </div>
                )}

                {data.pricing.type === 'QUANTITY' && (
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="1st Package (Daily)">
                      <StyledInput type="number" value={data.pricing.qtyFirst || 0} onChange={e => updatePricing('qtyFirst', parseInt(e.target.value))} />
                    </InputGroup>
                    <InputGroup label="Next Package (Daily)">
                      <StyledInput type="number" value={data.pricing.qtyNextRate || 0} onChange={e => updatePricing('qtyNextRate', parseInt(e.target.value))} />
                    </InputGroup>
                  </div>
                )}
             </div>
          </div>

          {/* Section 3: Add-ons */}
          <div className="grid grid-cols-2 gap-4">
             <div className={twMerge("border rounded-xl p-3 transition-colors", data.enableDelivery ? "border-green-200 bg-green-50/50" : "border-slate-200")}>
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <Truck className="w-4 h-4 text-slate-500" />
                     <span className="text-xs font-bold text-slate-700">Delivery</span>
                   </div>
                   <input type="checkbox" className="accent-green-600 w-4 h-4" checked={data.enableDelivery} onChange={e => setData(prev => ({...prev, enableDelivery: e.target.checked}))} />
                </div>
                {data.enableDelivery ? (
                   <StyledInput type="number" placeholder="Fee" value={data.deliveryFee} onChange={e=>setData(prev => ({...prev, deliveryFee: parseInt(e.target.value)}))} />
                ) : ( <div className="h-9 text-xs flex items-center text-slate-400">Disabled</div> )}
             </div>

             <div className={twMerge("border rounded-xl p-3 transition-colors", data.enableMembership ? "border-purple-200 bg-purple-50/50" : "border-slate-200")}>
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <CreditCard className="w-4 h-4 text-slate-500" />
                     <span className="text-xs font-bold text-slate-700">Membership</span>
                   </div>
                   <input type="checkbox" className="accent-purple-600 w-4 h-4" checked={data.enableMembership} onChange={e => setData(prev => ({...prev, enableMembership: e.target.checked}))} />
                </div>
                {data.enableMembership ? (
                   <StyledInput type="number" placeholder="Monthly Fee" value={data.membershipFee} onChange={e=>setData(prev => ({...prev, membershipFee: parseInt(e.target.value)}))} />
                ) : ( <div className="h-9 text-xs flex items-center text-slate-400">Disabled</div> )}
             </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave(data)} className="px-6 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-black transition-colors shadow-lg shadow-slate-300">Save Location</button>
        </div>
      </div>
    </div>
  )
}

export default Locations;
