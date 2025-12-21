
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Trash2 } from 'lucide-react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ role: 'STAFF' });

  useEffect(() => {
    setUsers(StorageService.getUsers());
    setLocations(StorageService.getLocations());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.name || !formData.password) return;
    
    const newUser: User = {
      id: `user_${Date.now()}`,
      username: formData.username,
      password: formData.password,
      name: formData.name,
      role: formData.role as Role,
      locationId: formData.locationId
    };

    StorageService.saveUser(newUser);
    setUsers(StorageService.getUsers());
    setIsModalOpen(false);
    setFormData({ role: 'STAFF' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">User Management</h3>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Assigned Location</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-6 py-4 font-medium">{u.name}</td>
                <td className="px-6 py-4 text-slate-500">{u.username}</td>
                <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                <td className="px-6 py-4 text-slate-500">{locations.find(l => l.id === u.locationId)?.name || '-'}</td>
                <td className="px-6 py-4 text-right">
                   {u.username !== 'admin' && (
                     <button onClick={() => { StorageService.deleteUser(u.id); setUsers(StorageService.getUsers()); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setIsModalOpen(false) }}>
           <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-lg">Add User</h3>
              <input className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Full Name" onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Username" onChange={e => setFormData({...formData, username: e.target.value})} required />
              <input className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} required />
              
              <select className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                <option value="ADMIN">Admin</option>
                <option value="STAFF">Staff</option>
              </select>

              {formData.role === 'STAFF' && (
                <select className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white" onChange={e => setFormData({...formData, locationId: e.target.value})} required>
                  <option value="">Select Location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}

              <div className="flex justify-end gap-2 mt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">Save</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default Users;
