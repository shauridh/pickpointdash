
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Location, Customer } from '../types';
import { UserCheck, Building } from 'lucide-react';


const SelfRegistration: React.FC = () => {
  const { locationId: paramLocationId } = useParams<{ locationId?: string }>();
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    unit: '',
    locationId: paramLocationId || ''
  });

  useEffect(() => {
    setLocations(StorageService.getLocations());
    if (paramLocationId) {
      setFormData(f => ({ ...f, locationId: paramLocationId }));
    }
  }, [paramLocationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would go to a "Pending Approval" queue.
    // For this simulation, we'll auto-add as a non-member customer.
    
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: formData.name,
      phoneNumber: formData.phone,
      unitNumber: formData.unit,
      locationId: formData.locationId,
      isMember: false
    };

    StorageService.saveCustomer(newCust);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
          <p className="text-slate-500 mb-6">Your data has been recorded. You will now receive notifications when packages arrive for Unit {formData.unit}.</p>
          <button onClick={() => window.location.href = '/'} className="text-blue-600 font-bold hover:underline">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden">
        <div className="bg-slate-900 p-6 text-white text-center">
          <h1 className="text-xl font-bold">Resident Registration</h1>
          <p className="text-slate-400 text-sm mt-1">Register your WhatsApp to receive package alerts</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Location selection or display */}
          {paramLocationId ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Building / Apartment</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
                  value={locations.find(l => l.id === paramLocationId)?.name || paramLocationId}
                  disabled
                  readOnly
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Building / Apartment</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <select 
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                  value={formData.locationId}
                  onChange={e => setFormData({...formData, locationId: e.target.value})}
                >
                  <option value="">Select Location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Number</label>
                <input className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="A-101" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Number</label>
            <input className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="62812345678" type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <p className="text-[10px] text-slate-400 mt-1">Make sure this number is active on WhatsApp.</p>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">
            Register Now
          </button>
        </form>
      </div>
    </div>
  );
};

export default SelfRegistration;
