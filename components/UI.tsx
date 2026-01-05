import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }> = ({ 
  className = '', 
  variant = 'primary', 
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    secondary: "bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-700",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    />
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; leftAddon?: string; helperText?: string }> = ({ label, leftAddon, helperText, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative">
        {leftAddon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm font-medium">{leftAddon}</span>
            </div>
        )}
        <input 
          className={`border border-gray-300 rounded-lg py-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all w-full ${leftAddon ? 'pl-10 pr-3' : 'px-3'} ${className} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          {...props}
        />
    </div>
    {helperText && <p className="text-xs text-gray-500 text-right font-mono">{helperText}</p>}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
  </div>
);

// Format Rupiah preserving decimals and showing trailing zeros to satisfy user request
export const formatRupiah = (amount: number) => {
  // We use 2 fraction digits as requested ("sampai desimal nol terakhir")
  // and do NOT use Math.round to satisfy "jangan ada pembulatan".
  return 'Rp ' + Math.abs(amount).toLocaleString('id-ID', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};