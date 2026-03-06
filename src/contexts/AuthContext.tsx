/**
 * Auth Context for managing authentication state and Firebase confirmation
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const [confirmation, setConfirmationState] = useState<any>(null);

  const setConfirmation = useCallback((c: any) => {
    setConfirmationState(c);
  }, []);

  const clearConfirmation = useCallback(() => {
    setConfirmationState(null);
  }, []);

  const value = {
    phoneNumber,
    setPhoneNumber,
    confirmation,
    setConfirmation,
    clearConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
