"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users as UsersIcon, Loader2, Plus, Edit, Trash2, Search, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

type SortKey = keyof User;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({ isOpen: false, userId: null, userName: "" });
  const [deleting, setDeleting] = useState(false);

  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    user: User | null;
  }>({ isOpen: false, mode: "add", user: null });
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "STAFF",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setCurrentUser(JSON.parse(userData));

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        throw new Error(data.error || "Failed to load users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("API error. Loading dummy data for Users.");
      const dummyUsers: User[] = Array.from({ length: 15 }).map((_, i) => ({
        id: `dummy-user-${i}`,
        name: `Dummy User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: i % 4 === 0 ? 'ADMIN' : 'STAFF',
        active: i % 2 === 0,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      }));
      setUsers(dummyUsers);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => {
        if (roleFilter === 'all') return true;
        return user.role === roleFilter;
      })
      .filter(user => {
        if (!searchQuery) return true;
        return (
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
  }, [users, searchQuery, roleFilter]);

  const sortedUsers = useMemo(() => {
    let sortableUsers = [...filteredUsers];
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [filteredUsers, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, sortConfig]);

  const handleAddClick = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "STAFF",
      active: true,
    });
    setUserModal({ isOpen: true, mode: "add", user: null });
  };

  const handleEditClick = (user: User) => {
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
      active: user.active,
    });
    setUserModal({ isOpen: true, mode: "edit", user });
  };

  const handleModalClose = () => {
    setUserModal({ isOpen: false, mode: "add", user: null });
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "STAFF",
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url =
        userModal.mode === "add"
          ? "/api/users"
          : `/api/users/${userModal.user?.id}`;
      const method = userModal.mode === "add" ? "POST" : "PUT";

      const body: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        active: formData.active,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `User ${userModal.mode === "add" ? "created" : "updated"} successfully`
        );
        fetchUsers();
        handleModalClose();
      } else {
        toast.error(data.error || "Failed to save user");
      }
    } catch (error) {
      toast.error("Network error saving user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (userId: string, userName: string) => {
    setDeleteDialog({ isOpen: true, userId, userName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.userId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/users/${deleteDialog.userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("User deleted successfully");
        setUsers(users.filter((u) => u.id !== deleteDialog.userId));
        setDeleteDialog({ isOpen: false, userId: null, userName: "" });
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Network error deleting user");
    } finally {
      setDeleting(false);
    }
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
  const paginatedUsers = sortedUsers.slice(start, end);

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
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Kelola user dan akses sistem ({sortedUsers.length} users)
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Tambah User
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex-shrink-0">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full md:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader sortKey="name">User</SortableHeader>
                <SortableHeader sortKey="email">Email</SortableHeader>
                <SortableHeader sortKey="role">Role</SortableHeader>
                <SortableHeader sortKey="active">Status</SortableHeader>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>
                      {searchQuery || roleFilter !== 'all'
                        ? "No users found matching your criteria"
                        : "No users available"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UsersIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user.id, user.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={sortedUsers.length}
        onPageChange={setPage}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() =>
          setDeleteDialog({ isOpen: false, userId: null, userName: "" })
        }
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteDialog.userName}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />

      <Modal
        isOpen={userModal.isOpen}
        onClose={handleModalClose}
        title={userModal.mode === "add" ? "Add New User" : "Edit User"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {userModal.mode === "edit" && "(leave empty to keep current)"}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={userModal.mode === "add"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : userModal.mode === "add" ? "Create" : "Update"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
