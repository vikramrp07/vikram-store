import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    const storedPin = localStorage.getItem('app_pin');
    if (!storedPin) {
      setSetupMode(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupMode) {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      localStorage.setItem('app_pin', pin);
      onLogin();
    } else {
      const storedPin = localStorage.getItem('app_pin');
      if (pin === storedPin || pin === '8888') { // 8888 as master fallback
        onLogin();
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-blue-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {setupMode ? 'Set Up Access PIN' : 'Authentication Required'}
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          {setupMode 
            ? 'Create a PIN to secure your inventory application.' 
            : 'Please enter your PIN to access the application.'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/[^0-9]/g, ''));
                setError('');
              }}
              className="w-full text-center text-3xl tracking-[0.5em] font-mono p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="flex items-center justify-center text-red-500 text-sm">
              <AlertCircle size={16} className="mr-1" />
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center"
          >
            <Unlock size={20} className="mr-2" />
            {setupMode ? 'Set PIN & Enter' : 'Unlock'}
          </button>
        </form>
        
        {!setupMode && (
           <p className="mt-4 text-xs text-gray-400">
             Forgot PIN? Clear your browser data or use master PIN 8888.
           </p>
        )}
      </div>
    </div>
  );
};
