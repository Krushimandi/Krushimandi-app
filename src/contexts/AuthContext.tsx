/**
 * Auth Context for managing authentication state and Firebase confirmation
 */

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

interface AuthContextType {
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  confirmation: any;
  setConfirmation: (confirmation: any) => void;
  clearConfirmation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const confirmationRef = useRef<any>(null);

  const setConfirmation = (confirmation: any) => {
    confirmationRef.current = confirmation;
  };

  const clearConfirmation = () => {
    confirmationRef.current = null;
  };

  const value = {
    phoneNumber,
    setPhoneNumber,
    confirmation: confirmationRef.current,
    setConfirmation,
    clearConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
