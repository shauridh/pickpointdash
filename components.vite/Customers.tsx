
import React, { useState, useEffect } from 'react';
import { Customer, User } from '../types';
import { StorageService } from '../services/storage';
import { WhatsAppService } from '../services/whatsapp';
import { Plus, Star, CreditCard, X, Calendar, ShieldCheck, Ban, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const Customers: React.FC<{ user: User }> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [managingCust, setManagingCust] = useState<Customer | null>(null); // For Membership Action
  
  // Form Data
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    setCustomers(StorageService.getCustomers());
    setLocations(StorageService.getLocations());
  }, []);

  // --- CRUD Handlers ---
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: formData.name!,
      phoneNumber: formData.phoneNumber!,
      unitNumber: formData.unitNumber!,
      locationId: formData.locationId!,
      isMember: false
    };
    StorageService.saveCustomer(newCust);
    setCustomers(StorageService.getCustomers());
    setIsAddModalOpen(false);
    setFormData({});
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
        StorageService.deleteCustomer(id);
        setCustomers(StorageService.getCustomers());
    }
  };

  const handleUpdateMembership = async (months: number) => {
    if (!managingCust) return;
    
    const now = new Date();
    // If currently valid, add to expiry. If expired or null, start from now.
    const currentExpiry = managingCust.membershipExpiry ? new Date(managingCust.membershipExpiry) : now;
    const start = currentExpiry > now ? currentExpiry : now;
    
    // Logic to add months
    const newExpiry = new Date(start);
    newExpiry.setMonth(newExpiry.getMonth() + months);
    
    const updated: Customer = {
      ...managingCust,
      isMember: true,
      membershipExpiry: newExpiry.toISOString()
    };
    
    StorageService.saveCustomer(updated);
    setCustomers(StorageService.getCustomers());
    
    // Send Notification
    const loc = locations.find(l => l.id === updated.locationId);
    if (loc) {
        const settings = StorageService.getSettings();
        await WhatsAppService.sendMemberActivation(updated, loc.name, settings);
    }
    
    setManagingCust(null); // Close modal
    alert(`Membership for ${managingCust.name} updated! Valid until ${newExpiry.toLocaleDateString()}. Notification sent.`);
  };

  const handleDeactivateMembership = () => {
    if (!managingCust) return;
    if (confirm("Are you sure you want to deactivate this membership?")) {
        const updated: Customer = {
            ...managingCust,
            isMember: false,
            membershipExpiry: undefined
        };
        StorageService.saveCustomer(updated);
        setCustomers(StorageService.getCustomers());
        setManagingCust(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
           <h3 className="text-lg font-bold text-slate-800">Customers & Members</h3>
           <p className="text-sm text-slate-500">Manage tenant data and subscription status.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-lg shadow-slate-200">
            <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-bold">Name / Status</th>
              <th className="px-6 py-4 font-bold">Contact Info</th>
              <th className="px-6 py-4 font-bold">Location</th>
              <th className="px-6 py-4 font-bold">Membership Expiry</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
             {customers.map(c => {
               const isMember = c.isMember && c.membershipExpiry && new Date(c.membershipExpiry) > new Date();
               return (
                 <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className={twMerge("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", isMember ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500")}>
                            {c.name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                                {c.name}
                                {isMember && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="text-[10px] uppercase font-bold tracking-wide mt-0.5 text-slate-400">
                                {isMember ? 'Premium Member' : 'Regular Customer'}
                            </div>
                        </div>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="font-medium text-slate-900">Unit {c.unitNumber}</div>
                     <div className="text-xs text-slate-500 flex items-center gap-1">{c.phoneNumber}</div>
                   </td>
                   <td className="px-6 py-4 text-slate-600">{locations.find(l => l.id === c.locationId)?.name || '-'}</td>
                   <td className="px-6 py-4">
                      {isMember ? (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg w-fit">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{new Date(c.membershipExpiry!).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No active subscription</span>
                      )}
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setManagingCust(c)}
                            className="text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors border border-slate-200"
                          >
                            Manage Membership
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Delete Customer"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                   </td>
                 </tr>
               )
             })}
             {customers.length === 0 && (
                 <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No customers found.</td></tr>
             )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL 1: ADD CUSTOMER --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setIsAddModalOpen(false) }}>
           <form onSubmit={handleSaveCustomer} className="bg-white rounded-2xl p-6 w-full sm:max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-slate-800">New Customer</h3>
                 <button type="button" onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Full Name</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. John Doe" onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Unit</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="A-101" onChange={e => setFormData({...formData, unitNumber: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Phone</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="628..." onChange={e => setFormData({...formData, phoneNumber: e.target.value})} required />
                    </div>
                </div>
                
                {user.role === 'ADMIN' ? (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Location</label>
                        <select className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white" onChange={e => setFormData({...formData, locationId: e.target.value})} required>
                        <option value="">Select Location</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                ) : (
                    <input type="hidden" value={user.locationId} />
                )}
             </div>

             <div className="flex justify-end gap-3 mt-8">
                 <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">Save Customer</button>
              </div>
           </form>
        </div>
      )}

      {/* --- MODAL 2: MANAGE MEMBERSHIP --- */}
      {managingCust && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setManagingCust(null) }}>
           <div className="bg-white rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               {/* Header with Pattern */}
               <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-24 h-24 transform rotate-12" /></div>
                   <h3 className="text-xl font-bold relative z-10">{managingCust.name}</h3>
                   <p className="text-slate-400 text-sm relative z-10 flex items-center gap-2 mt-1">
                       <ShieldCheck className="w-4 h-4" /> Membership Management
                   </p>
                   <button onClick={() => setManagingCust(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20"><X className="w-5 h-5" /></button>
               </div>

               <div className="p-6">
                   {/* Current Status */}
                   <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                       <div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Current Status</p>
                           <div className="flex items-center gap-2 mt-1">
                               {managingCust.isMember && managingCust.membershipExpiry && new Date(managingCust.membershipExpiry) > new Date() ? (
                                   <>
                                     <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                     <span className="font-bold text-green-700">Active Member</span>
                                   </>
                               ) : (
                                   <>
                                     <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                     <span className="font-bold text-slate-500">Inactive / Expired</span>
                                   </>
                               )}
                           </div>
                       </div>
                       {managingCust.membershipExpiry && (
                           <div className="text-right">
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valid Until</p>
                               <p className="font-mono font-medium text-slate-700">{new Date(managingCust.membershipExpiry).toLocaleDateString()}</p>
                           </div>
                       )}
                   </div>

                   {/* Actions Grid */}
                   <p className="text-sm font-bold text-slate-800 mb-3">Add Duration / Activate</p>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                       {[
                           { label: '1 Month', val: 1, price: 'Rp 50k' },
                           { label: '3 Months', val: 3, price: 'Rp 140k' },
                           { label: '6 Months', val: 6, price: 'Rp 270k' },
                           { label: '1 Year', val: 12, price: 'Rp 500k' }
                       ].map((opt) => (
                           <button 
                             key={opt.val}
                             onClick={() => handleUpdateMembership(opt.val)}
                             className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95"
                           >
                               <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700">{opt.label}</span>
                               <span className="text-xs text-slate-400 mt-1">{opt.price}</span>
                           </button>
                       ))}
                   </div>
                   
                   {/* Deactivate */}
                   {managingCust.isMember && (
                       <button 
                         onClick={handleDeactivateMembership}
                         className="w-full py-3 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                       >
                           <Ban className="w-4 h-4" /> Deactivate Membership
                       </button>
                   )}
               </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default Customers;
