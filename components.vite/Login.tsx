
import React, { useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { Lock, User as UserIcon } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = StorageService.getUsers();
    
    // Debug: log semua users yang ada
    console.log('🔍 Available users:', users.map(u => ({ username: u.username, password: u.password })));
    console.log('🔍 Login attempt:', { username, password });
    
    const found = users.find(u => u.username === username && u.password === password);
    
    if (found) {
      StorageService.addActivity({
        id: `act_${Date.now()}`,
        type: 'LOGIN',
        description: 'User logged in',
        timestamp: new Date().toISOString(),
        userId: found.id,
        userName: found.name
      });
      onLogin(found);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
             <span className="text-3xl text-white font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Pickpoint Dashboard</h1>
          <p className="text-slate-500 mt-2">Sign in to manage your apartment packages</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-200 active:transform active:scale-95 cursor-pointer"
          >
            Sign In
          </button>
        </form>

        {window.location.hostname !== 'admin.pickpoint.my.id' && (
          <div className="mt-8 text-center text-xs text-slate-400">
            <p>Demo Credentials:</p>
            <p>Admin: admin / password</p>
            <p>Staff: staff / password</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
