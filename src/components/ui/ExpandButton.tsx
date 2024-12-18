import React from 'react';

interface ExpandButtonProps {
  expanded: boolean;
  onClick: () => void;
  className?: string;
}

export function ExpandButton({ expanded, onClick, className = '' }: ExpandButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors
        ${expanded 
          ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' 
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }
        ${className}`}
    >
      {expanded ? 'Collapse' : 'Expand'}
    </button>
  );
}