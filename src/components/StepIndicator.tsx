import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, stepLabels }) => {
  return (
    <div className="w-full mb-6 sm:mb-8">
      <div className="flex items-center justify-between relative px-2 sm:px-4">
        {/* Progress line background */}
        <div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 sm:h-1 bg-gray-200 rounded-full mx-6 sm:mx-8" />
        {/* Progress line active */}
        <div
          className="absolute top-4 sm:top-5 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mx-6 sm:mx-8 transition-all duration-500 ease-out"
          style={{ width: `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - 3rem + ${((currentStep - 1) / (totalSteps - 1)) * 3}rem)` }}
        />

        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <div key={step} className="relative flex flex-col items-center z-10">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg scale-100'
                    : isActive
                    ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-200 scale-110 animate-pulse-glow'
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : step}
              </div>
              <span
                className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold text-center transition-colors max-w-[60px] sm:max-w-none leading-tight ${
                  isActive ? 'text-primary-600' : isCompleted ? 'text-success-600' : 'text-gray-400'
                }`}
              >
                {stepLabels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
