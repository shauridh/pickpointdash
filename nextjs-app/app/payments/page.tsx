"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Plus, Search, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/Pagination";

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  location: {
    name: string;
  };
  package?: {
    trackingCode: string;
  };
  createdAt: string;
}

type SortKey = keyof Payment | 'trackingCode' | 'locationName';


export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });


  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    fetchPayments();
  }, [router]);

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments");
      const data = await response.json();
      if (data.success) {
        setPayments(data.data);
      } else {
        toast.error("Failed to load payments");
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      toast.error("Network error loading payments");
      setLoading(false);
    }
  };
  
  const filteredPayments = useMemo(() => {
    return payments
      .filter(payment => {
        if (statusFilter === 'all') return true;
        return payment.status === statusFilter;
      })
      .filter(payment => {
        if (!searchQuery) return true;
        return (
          payment.package?.trackingCode
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          payment.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
          payment.location.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
  }, [payments, searchQuery, statusFilter]);

  const sortedPayments = useMemo(() => {
    let sortableItems = [...filteredPayments];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'trackingCode':
            aValue = a.package?.trackingCode || '';
            bValue = b.package?.trackingCode || '';
            break;
          case 'locationName':
            aValue = a.location.name;
            bValue = b.location.name;
            break;
          default:
            aValue = a[sortConfig.key as keyof Payment];
            bValue = b[sortConfig.key as keyof Payment];
            break;
        }

        if (aValue !== undefined && bValue !== undefined) {
          if (aValue < bValue) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredPayments, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    setPage(1); 
  }, [searchQuery, statusFilter, sortConfig]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedPayments = sortedPayments.slice(start, end);

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
          <h2 className="text-2xl font-bold text-gray-900">
            Payment Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Kelola pembayaran dan transaksi ({sortedPayments.length} payments)
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
          <Plus className="h-4 w-4" />
          Input Pembayaran
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking code, method, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex-shrink-0">
           <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader sortKey="trackingCode">Tracking Code</SortableHeader>
                <SortableHeader sortKey="amount">Amount</SortableHeader>
                <SortableHeader sortKey="method">Method</SortableHeader>
                <SortableHeader sortKey="locationName">Location</SortableHeader>
                <SortableHeader sortKey="status">Status</SortableHeader>
                <SortableHeader sortKey="createdAt">Date</SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>
                      {searchQuery || statusFilter !== 'all'
                        ? "No payments found matching your criteria"
                        : "Belum ada pembayaran"}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <p className="text-sm mt-1">
                        Klik "Input Pembayaran" untuk menambah
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.package?.trackingCode || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {payment.location.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={sortedPayments.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}