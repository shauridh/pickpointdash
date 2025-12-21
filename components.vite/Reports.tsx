
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const Reports: React.FC = () => {
  const [graphData, setGraphData] = useState<any[]>([]);

  useEffect(() => {
    // Simulated Data - In real app, calculate from StorageService.getPackages()
    setGraphData([
      { name: 'Mon', in: 10, out: 8 },
      { name: 'Tue', in: 15, out: 10 },
      { name: 'Wed', in: 8, out: 12 },
      { name: 'Thu', in: 20, out: 15 },
      { name: 'Fri', in: 25, out: 20 },
      { name: 'Sat', in: 18, out: 18 },
      { name: 'Sun', in: 5, out: 4 },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Traffic Overview</h3>
                <p className="text-sm text-slate-500">Weekly package flow analysis</p>
            </div>
            <button className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-colors">
                <Download className="w-4 h-4" /> Export CSV
            </button>
        </div>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="in" name="Incoming" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="out" name="Outgoing" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex items-center justify-center text-slate-400">
              Future Chart: Revenue Trend
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex items-center justify-center text-slate-400">
              Future Chart: Courier Performance
          </div>
      </div>
    </div>
  );
};

export default Reports;
