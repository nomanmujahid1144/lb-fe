'use client';

import React from 'react';

interface Company {
  id: number;
  name: string;
  website_url: string;
  linkedin_url?: string;
  company_type: string;
  sbi_code?: string;
  company_id?: string;
  city: string;
  size?: string;
  industry_company: string;
  customers: Array<{ customer_name: string }>;
  scraped?: boolean | string;
  description?: string;
  website_scrape?: {
    documentId: string;
    id: number;
  };
}

interface CompanyDetailsModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
}

export default function CompanyDetailsModal({ isOpen, company, onClose }: CompanyDetailsModalProps) {
  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Company Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.company_id || '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SBI Code</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.sbi_code || '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.industry_company}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.size || '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.city}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.company_type}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scraped</label>
                <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {company.website_scrape ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                {company.description || '-'}
              </div>
            </div>            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900 break-all">
                {company.website_url ? (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {company.website_url}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900 break-all">
                {company.linkedin_url ? (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {company.linkedin_url}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customers</label>
              <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                {company.customers && company.customers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {company.customers.map((customer, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                      >
                        {customer.customer_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  'No customers assigned'
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}