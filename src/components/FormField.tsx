import React from 'react';
import SearchableSelect from './SearchableSelect';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'textarea' | 'select' | 'radio' | 'checkboxGroup' | 'searchableSelect' | 'multiSearchableSelect';
  placeholder?: string;
  value: any;
  onChange: (e: any) => void;
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  radioOptions?: { value: string; label: string; icon?: React.ReactNode }[];
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  options,
  icon,
  required = true,
  error,
  radioOptions,
}) => {
  const handleCheckboxChange = (optionValue: string) => {
    const currentValue = Array.isArray(value) ? value : [];
    const newValue = currentValue.includes(optionValue)
      ? currentValue.filter((v) => v !== optionValue)
      : [...currentValue, optionValue];
    
    onChange({
      target: {
        name,
        value: newValue,
      },
    });
  };

  return (
    <div className="group">
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-primary-600 transition-colors"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {type === 'searchableSelect' || type === 'multiSearchableSelect' ? (
        <SearchableSelect
          options={options || []}
          value={value}
          multiple={type === 'multiSearchableSelect'}
          onChange={(newValue: any) => onChange({ target: { name, value: newValue } })}
          placeholder={placeholder}
        />
      ) : type === 'checkboxGroup' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {options?.map((opt) => {
            const isChecked = Array.isArray(value) && value.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2 p-2.5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  isChecked
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-gray-100 bg-white/50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                  isChecked ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-300'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isChecked}
                  onChange={() => handleCheckboxChange(opt.value)}
                />
                <span className="text-xs font-semibold truncate">{opt.label}</span>
              </label>
            );
          })}
        </div>
      ) : type === 'textarea' ? (
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors">
              {icon}
            </div>
          )}
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={3}
            className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 border-2 rounded-xl text-gray-800 placeholder-gray-400 transition-all duration-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 bg-white/80 backdrop-blur-sm hover:border-gray-400 resize-none ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
            }`}
          />
        </div>
      ) : type === 'select' ? (
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10">
              {icon}
            </div>
          )}
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-10 py-3 border-2 rounded-xl text-gray-800 transition-all duration-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 bg-white/80 backdrop-blur-sm hover:border-gray-400 appearance-none cursor-pointer ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
            } ${!value ? 'text-gray-400' : ''}`}
          >
            <option value="" disabled>
              {placeholder || 'Pilih...'}
            </option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      ) : type === 'radio' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {radioOptions?.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:border-primary-300 ${
                value === opt.value
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 bg-white/80'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={onChange}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              {opt.icon && <span className="text-primary-500">{opt.icon}</span>}
              <span className={`text-sm font-medium ${value === opt.value ? 'text-primary-700' : 'text-gray-600'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
              {icon}
            </div>
          )}
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 border-2 rounded-xl text-gray-800 placeholder-gray-400 transition-all duration-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 bg-white/80 backdrop-blur-sm hover:border-gray-400 ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
            }`}
          />
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
