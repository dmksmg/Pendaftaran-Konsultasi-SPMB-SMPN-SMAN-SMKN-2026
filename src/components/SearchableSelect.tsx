import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | string[];
  onChange: (newValue: any) => void;
  placeholder?: string;
  multiple?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  multiple = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleToggle = (optionValue: string) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter(v => v !== optionValue)
        : [...currentValue, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleSelectAll = () => {
    if (!multiple) return;
    const allFilteredValues = filteredOptions.map(opt => opt.value);
    const currentValue = Array.isArray(value) ? value : [];
    const otherValues = currentValue.filter(v => !filteredOptions.find(opt => opt.value === v));
    onChange([...new Set([...otherValues, ...allFilteredValues])]);
  };

  const handleClearAll = () => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const filteredValues = filteredOptions.map(opt => opt.value);
      onChange(currentValue.filter(v => !filteredValues.includes(v)));
    } else {
      onChange("");
    }
  };

  const getDisplayValue = () => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      if (vals.length === 0) return <span className="text-gray-400">{placeholder}</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {vals.slice(0, 2).map(v => (
            <span key={v} className="bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              {options.find(opt => opt.value === v)?.label || v}
              <X 
                className="w-2.5 h-2.5 cursor-pointer hover:text-primary-900" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(v);
                }}
              />
            </span>
          ))}
          {vals.length > 2 && (
            <span className="text-gray-500 text-[10px] font-bold self-center">
              +{vals.length - 2} lainnya
            </span>
          )}
        </div>
      );
    } else {
      const selectedOpt = options.find(opt => opt.value === value);
      return selectedOpt ? (
        <span className="text-gray-800 font-medium">{selectedOpt.label}</span>
      ) : (
        <span className="text-gray-400">{placeholder}</span>
      );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-300 focus:outline-none ${
          isOpen ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden">
          {getDisplayValue()}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                autoFocus
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[11px] font-medium text-gray-500">
                {filteredOptions.length} dari {options.length} ditemukan
              </span>
              <div className="flex gap-4">
                {multiple && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Pilih Semua
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={`text-[11px] font-bold hover:opacity-80 transition-colors ${multiple ? 'text-red-500' : 'text-gray-400'}`}
                >
                  {multiple ? 'Hapus Semua' : 'Bersihkan'}
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">Tidak ada hasil ditemukan</p>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                      selected ? 'bg-red-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                      selected 
                        ? 'bg-red-600 border-red-600' 
                        : 'bg-white border-gray-200 group-hover:border-gray-300'
                    }`}>
                      {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                    </div>
                    <span className={`text-sm font-semibold uppercase tracking-tight ${
                      selected ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {opt.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
