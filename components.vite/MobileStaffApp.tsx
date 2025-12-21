import React, { useState, useEffect } from 'react';
import { User } from '../types';
import Login from './Login';
import StaffMobile from './StaffMobile';

const MobileStaffApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const sessionUser = sessionStorage.getItem('pp_mobile_session');
    if (sessionUser) {
      const parsedUser = JSON.parse(sessionUser);
      // Only allow STAFF role for mobile route
      if (parsedUser.role === 'STAFF') {
        setUser(parsedUser);
      } else {
        sessionStorage.removeItem('pp_mobile_session');
      }
    }
  }, []);

  const handleLogin = (u: User) => {
    if (u.role !== 'STAFF') {
      alert('⚠️ Route ini hanya untuk Staff. Silakan login melalui admin.pickpoint.my.id untuk Admin.');
      return;
    }
    sessionStorage.setItem('pp_mobile_session', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pp_mobile_session');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <StaffMobile user={user} onLogout={handleLogout} />;
};

export default MobileStaffApp;
