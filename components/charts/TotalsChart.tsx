'use client';

import { BarChart } from '@mui/x-charts/BarChart';
import { useState } from 'react';

interface DailyStat {
  date: string;
  requestsSent: number;
  connectedCounts: number;
  repliedCounts: number;
  positiveCounts: number;
}

interface CampaignStats {
  requestsSent: Record<string, number>;
  connectedCounts: Record<string, number>;
  connectedRates: Record<string, number>;
  repliedCounts: Record<string, number>;
  repliedRates: Record<string, number>;
  positiveCounts: Record<string, number>;
  positiveRates: Record<string, number>;
  totalRates: Record<string, number>;
  totals: {
    requestsSent: number;
    connectedCounts: number;
    repliedCounts: number;
    positiveCounts: number;
  };
  averages: {
    connectedRates: number;
    repliedRates: number;
    positiveRates: number;
    totalRates: number;
  };
}

interface TotalsChartProps {
  campaignStats: CampaignStats;
  totalsStats?: CampaignStats; // For always showing all-time totals in cards
  profileName?: string;
  loading?: boolean;
  dailyStats?: DailyStat[]; // <-- Add this prop
}

export default function TotalsChart({ campaignStats, totalsStats, profileName, loading = false, dailyStats = [] }: TotalsChartProps) {
  // Remove the chartType state since we're showing all charts now
  // const [chartType, setChartType] = useState<'daily' | 'weeklyPos' | 'weeklyReplies'>('daily');

  // Use totalsStats for summary cards if provided, otherwise fall back to campaignStats
  const summaryStats = totalsStats || campaignStats;

  // Helper function to get week number and year
  const getWeekInfo = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  // Helper function to get weeks from dailyStats date range
  const getWeeksFromDateRange = (): string[] => {
    if (dailyStats.length === 0) return [];
    
    const weeks: Set<string> = new Set();
    dailyStats.forEach(stat => {
      const date = new Date(stat.date);
      weeks.add(getWeekInfo(date));
    });
    
    return Array.from(weeks).sort();
  };

  // Calculate weekly positive data
  const getWeeklyPositiveData = () => {
    const weeks = getWeeksFromDateRange();
    const weeklyData: Record<string, number> = {};
    
    // Initialize all weeks with 0
    weeks.forEach(week => {
      weeklyData[week] = 0;
    });

    // Count positives by week from filtered dailyStats
    dailyStats.forEach(stat => {
      const date = new Date(stat.date);
      const week = getWeekInfo(date);
      if (weeklyData.hasOwnProperty(week)) {
        weeklyData[week] += stat.positiveCounts;
      }
    });

    return {
      weeks: weeks,
      data: weeks.map(week => weeklyData[week])
    };
  };

  // Calculate weekly replies data
  const getWeeklyRepliesData = () => {
    const weeks = getWeeksFromDateRange();
    const weeklyData: Record<string, number> = {};
    
    // Initialize all weeks with 0
    weeks.forEach(week => {
      weeklyData[week] = 0;
    });

    // Count replies by week from filtered dailyStats
    dailyStats.forEach(stat => {
      const date = new Date(stat.date);
      const week = getWeekInfo(date);
      if (weeklyData.hasOwnProperty(week)) {
        weeklyData[week] += stat.repliedCounts;
      }
    });

    return {
      weeks: weeks,
      data: weeks.map(week => weeklyData[week])
    };
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4 mx-auto"></div>
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const chartData = [
    {
      metric: 'Requests Sent',
      value: campaignStats.totals.requestsSent,
      color: '#DC3044',
    },
    {
      metric: 'Connected',
      value: campaignStats.totals.connectedCounts,
      color: '#A53752',
    },
    {
      metric: 'Replied',
      value: campaignStats.totals.repliedCounts,
      color: '#6E3E61',
    },
    {
      metric: 'Positive',
      value: campaignStats.totals.positiveCounts,
      color: '#374570',
    },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const isAllZero = total === 0;

  const title = profileName ? `Daily Statistics for ${profileName}` : 'Overall Statistics';

  // Prepare stacked bar chart data
  const barXAxis = dailyStats.map((stat) => stat.date);
  const requestsSentSeries = dailyStats.map((stat) => stat.requestsSent);
  const connectedSeries = dailyStats.map((stat) => stat.connectedCounts);
  const repliedSeries = dailyStats.map((stat) => stat.repliedCounts);
  const positiveSeries = dailyStats.map((stat) => stat.positiveCounts);

  return (
    <>
      {/* Header */}
      <div className="mb-2 text-center">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>

      {/* Daily Stats Chart */}
      <div className="mb-2">
        <div className="flex justify-center">
          {isAllZero ? (
            <div className="text-gray-500 text-center py-12">No data to display.</div>
          ) : (
            <div style={{ width: '100%', maxWidth: '1200px', overflowX: 'auto' }}>
              <BarChart
                xAxis={[
                  {
                    id: 'date',
                    data: barXAxis,
                    scaleType: 'band',
                  },
                ]}
                series={[
                  {
                    data: requestsSentSeries,
                    label: 'Requests Sent',
                    color: '#DC3044',
                    stack: 'total',
                  },
                  {
                    data: connectedSeries,
                    label: 'Connected',
                    color: '#A53752',
                    stack: 'total',
                  },
                  {
                    data: repliedSeries,
                    label: 'Replied',
                    color: '#6E3E61',
                    stack: 'total',
                  },
                  {
                    data: positiveSeries,
                    label: 'Positive',
                    color: '#374570',
                    stack: 'total',
                  },
                ]}
                height={280}
                width={Math.max(1000, barXAxis.length * 35)}
                margin={{ left: 80, right: 40, top: 20, bottom: 80 }}
                grid={{ vertical: true, horizontal: true }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Weekly Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Weekly Positive Chart */}
        <div className="flex justify-center">
          <div style={{ width: '100%', maxWidth: '600px', overflowX: 'auto' }}>
            <div className="text-center mb-1">
              <h4 className="text-md font-medium text-gray-700">Weekly Positive Responses</h4>
            </div>
            <BarChart
              xAxis={[
                {
                  id: 'week',
                  data: getWeeklyPositiveData().weeks,
                  scaleType: 'band',
                },
              ]}
              series={[
                {
                  data: getWeeklyPositiveData().data,
                  label: 'Positive',
                  color: '#374570',
                },
              ]}
              height={240}
              width={Math.max(500, getWeeklyPositiveData().weeks.length * 45)}
              margin={{ left: 60, right: 30, top: 20, bottom: 60 }}
              grid={{ vertical: false, horizontal: true }}
            />
          </div>
        </div>

        {/* Weekly Replies Chart */}
        <div className="flex justify-center">
          <div style={{ width: '100%', maxWidth: '600px', overflowX: 'auto' }}>
            <div className="text-center mb-1">
              <h4 className="text-md font-medium text-gray-700">Weekly Replies</h4>
            </div>
            <BarChart
              xAxis={[
                {
                  id: 'week',
                  data: getWeeklyRepliesData().weeks,
                  scaleType: 'band',
                },
              ]}
              series={[
                {
                  data: getWeeklyRepliesData().data,
                  label: 'Replied',
                  color: '#6E3E61',
                },
              ]}
              height={240}
              width={Math.max(500, getWeeklyRepliesData().weeks.length * 45)}
              margin={{ left: 60, right: 30, top: 20, bottom: 60 }}
              grid={{ vertical: false, horizontal: true }}
            />
          </div>
        </div>
      </div>

      {/* Totals Display for Filtered Date Range */}
      <div className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Requests Sent</p>
                <p className="text-2xl font-bold text-[#47577d]">
                  {dailyStats.reduce((sum, day) => sum + day.requestsSent, 0)}
                </p>
              </div>
              <div className="text-[#47577d] opacity-20">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connected</p>
                <p className="text-2xl font-bold text-[#47577d]">
                  {dailyStats.reduce((sum, day) => sum + day.connectedCounts, 0)}
                </p>
              </div>
              <div className="text-[#47577d] opacity-20">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Replied</p>
                <p className="text-2xl font-bold text-[#47577d]">
                  {dailyStats.reduce((sum, day) => sum + day.repliedCounts, 0)}
                </p>
              </div>
              <div className="text-[#47577d] opacity-20">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Positive</p>
                <p className="text-2xl font-bold text-[#47577d]">
                  {dailyStats.reduce((sum, day) => sum + day.positiveCounts, 0)}
                </p>
              </div>
              <div className="text-[#47577d] opacity-20">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}