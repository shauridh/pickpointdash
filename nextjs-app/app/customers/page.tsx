"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users as CustomersIcon, Loader2, Search, ArrowUp, ArrowDown, Plus, Star, CreditCard, X, Calendar, ShieldCheck, Ban, Trash2, Edit } from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import { twMerge } from "tailwind-merge";

interface Customer {
  id: string;
  name: string;
  phone: string;
  unitNumber: string;
  locationId: string;
  location: string;
  isMember: boolean;
  membershipExpiry?: string;
  packageCount: number;
  lastActivity: string;
}

interface Location {
  id: string;
  name: string;
}

type SortKey = keyof Customer;

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [managingCust, setManagingCust] = useState<Customer | null>(null);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<Customer>>({});

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'lastActivity', direction: 'descending' });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    fetchCustomers();
    fetchLocations();
  }, [router]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers", { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data);
      } else {
        toast.error("Failed to load customer data");
      }
    } catch (error) {
      console.error("Failed to fetch customer data:", error);
      toast.error("Network error loading customer data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations", { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingCust ? 'PUT' : 'POST';
      const body = editingCust ? { ...formData, id: editingCust.id } : formData;

      const response = await fetch("/api/customers", {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingCust ? "Customer updated successfully" : "Customer added successfully");
        setCustomers(prev => editingCust
          ? prev.map(c => c.id === editingCust.id ? data.data : c)
          : [...prev, data.data]
        );
        setIsAddModalOpen(false);
        setEditingCust(null);
        setFormData({});
      } else {
        toast.error(data.error || "Failed to save customer");
      }
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast.error("Network error saving customer");
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Customer deleted successfully");
        setCustomers(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error(data.error || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error("Network error deleting customer");
    }
  };

  const handleUpdateMembership = async (months: number) => {
    if (!managingCust) return;

    const now = new Date();
    const currentExpiry = managingCust.membershipExpiry ? new Date(managingCust.membershipExpiry) : now;
    const start = currentExpiry > now ? currentExpiry : now;

    const newExpiry = new Date(start);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    try {
      const response = await fetch("/api/customers", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: managingCust.id,
          isMember: true,
          membershipExpiry: newExpiry.toISOString(),
        }),
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Membership updated until ${newExpiry.toLocaleDateString()}`);
        setCustomers(prev => prev.map(c => c.id === managingCust.id ? data.data : c));
        setManagingCust(null);
      } else {
        toast.error(data.error || "Failed to update membership");
      }
    } catch (error) {
      console.error("Failed to update membership:", error);
      toast.error("Network error updating membership");
    }
  };

  const handleDeactivateMembership = async () => {
    if (!managingCust) return;

    if (!confirm("Are you sure you want to deactivate this membership?")) {
      return;
    }

    try {
      const response = await fetch("/api/customers", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: managingCust.id,
          isMember: false,
          membershipExpiry: null,
        }),
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Membership deactivated");
        setCustomers(prev => prev.map(c => c.id === managingCust.id ? data.data : c));
        setManagingCust(null);
      } else {
        toast.error(data.error || "Failed to deactivate membership");
      }
    } catch (error) {
      console.error("Failed to deactivate membership:", error);
      toast.error("Network error deactivating membership");
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.unitNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...filteredCustomers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCustomers, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortConfig]);

  const openEditModal = (customer: Customer) => {
    setEditingCust(customer);
    setFormData({
      name: customer.name,
      phoneNumber: customer.phone,
      unitNumber: customer.unitNumber,
      locationId: customer.locationId,
    });
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingCust(null);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedCustomers = sortedCustomers.slice(start, end);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const SortableHeader = ({ sortKey, children }: { sortKey: SortKey, children: React.ReactNode }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button className="flex items-center gap-1" onClick={() => requestSort(sortKey)}>
        {children}
        {sortConfig?.key === sortKey && (
          sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        )}
      </button>
    </th>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage tenant data and membership status ({sortedCustomers.length} customers)
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader sortKey="name">Name / Status</SortableHeader>
                <SortableHeader sortKey="phone">Contact Info</SortableHeader>
                <SortableHeader sortKey="unitNumber">Unit</SortableHeader>
                <SortableHeader sortKey="location">Location</SortableHeader>
                <SortableHeader sortKey="packageCount">Packages</SortableHeader>
                <SortableHeader sortKey="lastActivity">Last Activity</SortableHeader>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <CustomersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>
                      {searchQuery
                        ? "No customers found matching your search"
                        : "No customer data available"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const isMember = customer.isMember && customer.membershipExpiry && new Date(customer.membershipExpiry) > new Date();
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={twMerge("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", isMember ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500")}>
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1">
                              {customer.name}
                              {isMember && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="text-[10px] uppercase font-bold tracking-wide mt-0.5 text-gray-400">
                              {isMember ? 'Premium Member' : 'Regular Customer'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.unitNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{customer.location}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {customer.packageCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{formatDate(customer.lastActivity)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setManagingCust(customer)}
                            className="text-xs font-bold bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors border border-gray-200"
                          >
                            Manage Membership
                          </button>
                          <button
                            onClick={() => openEditModal(customer)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={sortedCustomers.length}
        onPageChange={setPage}
      />

      {/* --- MODAL 1: ADD/EDIT CUSTOMER --- */}
      <Modal isOpen={isAddModalOpen} onClose={closeModal} title={editingCust ? "Edit Customer" : "Add New Customer"}>
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Full Name</label>
            <input
              className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. John Doe"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Unit</label>
              <input
                className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="A-101"
                value={formData.unitNumber || ''}
                onChange={e => setFormData({...formData, unitNumber: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Phone</label>
              <input
                className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="628..."
                value={formData.phoneNumber || ''}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Location</label>
            <select
              className="w-full border border-gray-200 p-2.5 rounded-lg text-sm bg-white"
              value={formData.locationId || ''}
              onChange={e => setFormData({...formData, locationId: e.target.value})}
              required
            >
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
              {editingCust ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: MANAGE MEMBERSHIP --- */}
      {managingCust && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setManagingCust(null) }}>
          <div className="bg-white rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with Pattern */}
            <div className="bg-gray-900 p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-24 h-24 transform rotate-12" /></div>
              <h3 className="text-xl font-bold relative z-10">{managingCust.name}</h3>
              <p className="text-gray-400 text-sm relative z-10 flex items-center gap-2 mt-1">
                <ShieldCheck className="w-4 h-4" /> Membership Management
              </p>
              <button onClick={() => setManagingCust(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6">
              {/* Current Status */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Current Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {managingCust.isMember && managingCust.membershipExpiry && new Date(managingCust.membershipExpiry) > new Date() ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-bold text-green-700">Active Member</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                        <span className="font-bold text-gray-500">Inactive / Expired</span>
                      </>
                    )}
                  </div>
                </div>
                {managingCust.membershipExpiry && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Valid Until</p>
                    <p className="font-mono font-medium text-gray-700">{new Date(managingCust.membershipExpiry).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Actions Grid */}
              <p className="text-sm font-bold text-gray-800 mb-3">Add Duration / Activate</p>
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
                    className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95"
                  >
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">{opt.label}</span>
                    <span className="text-xs text-gray-400 mt-1">{opt.price}</span>
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
  );
}
