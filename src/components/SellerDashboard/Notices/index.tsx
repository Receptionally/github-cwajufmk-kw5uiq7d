import React from 'react';
import { AlertCircle, Tag, X } from 'lucide-react';

interface Notice {
  id: string;
  type: 'sale' | 'info' | 'warning';
  title: string;
  message: string;
  startDate?: string;
  endDate?: string;
}

const MOCK_NOTICES: Notice[] = [
  {
    id: '1',
    type: 'sale',
    title: 'Holiday Season Sale',
    message: 'Starting today! Offer free delivery on orders over $500 to attract more customers during the holiday season.',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  }
];

export function Notices() {
  const [notices, setNotices] = React.useState(MOCK_NOTICES);

  const dismissNotice = (id: string) => {
    setNotices(notices.filter(notice => notice.id !== id));
  };

  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {notices.map(notice => (
        <div 
          key={notice.id}
          className={`relative rounded-lg p-4 ${
            notice.type === 'sale' 
              ? 'bg-orange-50 border-l-4 border-orange-500'
              : notice.type === 'warning'
              ? 'bg-yellow-50 border-l-4 border-yellow-500'
              : 'bg-blue-50 border-l-4 border-blue-500'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notice.type === 'sale' ? (
                <Tag className={`h-5 w-5 ${
                  notice.type === 'sale' ? 'text-orange-400' : 'text-blue-400'
                }`} />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                notice.type === 'sale' 
                  ? 'text-orange-800'
                  : notice.type === 'warning'
                  ? 'text-yellow-800'
                  : 'text-blue-800'
              }`}>
                {notice.title}
              </h3>
              <div className={`mt-2 text-sm ${
                notice.type === 'sale'
                  ? 'text-orange-700'
                  : notice.type === 'warning'
                  ? 'text-yellow-700'
                  : 'text-blue-700'
              }`}>
                <p>{notice.message}</p>
                {notice.startDate && notice.endDate && (
                  <p className="mt-1 text-xs">
                    Valid from {new Date(notice.startDate).toLocaleDateString()} to {new Date(notice.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => dismissNotice(notice.id)}
                className={`rounded-md inline-flex text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  notice.type === 'sale'
                    ? 'text-orange-600 hover:text-orange-500 focus:ring-orange-500'
                    : notice.type === 'warning'
                    ? 'text-yellow-600 hover:text-yellow-500 focus:ring-yellow-500'
                    : 'text-blue-600 hover:text-blue-500 focus:ring-blue-500'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}