import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LeaderboardUser {
  rank: number;
  twitterUsername: string;
  totalLaunchpadEarned: number;
  totalVolume: number;
  totalTrades: number;
  estimatedValue: number;
}

interface LeaderboardProps {
  type?: 'all-time' | 'daily';
  limit?: number;
  showUserRank?: boolean;
  userTwitterUsername?: string;
}

export default function Leaderboard({ 
  type = 'all-time', 
  limit = 100, 
  showUserRank = false,
  userTwitterUsername 
}: LeaderboardProps) {
  const [selectedType, setSelectedType] = useState(type);

  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['leaderboard', selectedType, limit],
    queryFn: async () => {
      const endpoint = selectedType === 'daily' 
        ? `/api/leaderboard/daily?limit=${limit}`
        : `/api/leaderboard/top-users?limit=${limit}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      return data.data as LeaderboardUser[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: userRank } = useQuery({
    queryKey: ['userRank', userTwitterUsername],
    queryFn: async () => {
      if (!userTwitterUsername) return null;
      
      const response = await fetch(`/api/leaderboard/top-users?limit=1000`);
      if (!response.ok) {
        throw new Error('Failed to fetch user rank');
      }
      const data = await response.json();
      const user = data.data.find((u: LeaderboardUser) => 
        u.twitterUsername === userTwitterUsername
      );
      return user || null;
    },
    enabled: !!userTwitterUsername && showUserRank,
    refetchInterval: 30000,
  });

  if (error) {
    toast.error('Failed to load leaderboard');
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-500">Failed to load leaderboard</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedType === 'daily' ? 'Daily' : 'All-Time'} Leaderboard
          </h2>
          <p className="text-gray-600 mt-1">
            Top traders earning $Launchpad rewards
          </p>
        </div>
        
        {/* Type Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedType('all-time')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedType === 'all-time'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All-Time
          </button>
          <button
            onClick={() => setSelectedType('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedType === 'daily'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      {/* User Rank Display */}
      {showUserRank && userRank && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your Rank</p>
              <p className="text-2xl font-bold text-gray-900">#{userRank.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Earned</p>
              <p className="text-xl font-bold text-green-600">
                {userRank.totalLaunchpadEarned.toLocaleString()} $Launchpad
              </p>
              <p className="text-sm text-gray-500">
                ≈ ${userRank.estimatedValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 w-16 sm:w-auto">Rank</th>
              <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 w-32 sm:w-auto">User</th>
              <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-900 w-24 sm:w-auto">$Launchpad Earned</th>
              <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-900 w-16 sm:w-auto">Trades</th>
              <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-900 w-20 sm:w-auto">Value</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-2 sm:px-4">
                    <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <div className="w-24 h-6 bg-gray-200 rounded animate-pulse ml-auto"></div>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <div className="w-16 h-6 bg-gray-200 rounded animate-pulse ml-auto"></div>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <div className="w-20 h-6 bg-gray-200 rounded animate-pulse ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : (
              leaderboardData?.map((user, index) => (
                <tr 
                  key={user.twitterUsername} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    userTwitterUsername === user.twitterUsername ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="py-3 px-2 sm:px-4">
                    <div className="flex items-center">
                      {index < 3 ? (
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-gray-600 font-medium">#{user.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold mr-2 sm:mr-3">
                        {user.twitterUsername.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        @{user.twitterUsername}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <span className="font-bold text-green-600 text-sm sm:text-base">
                      {user.totalLaunchpadEarned.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <span className="text-gray-700 text-sm sm:text-base">
                      {user.totalTrades.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <span className="font-medium text-gray-900 text-sm sm:text-base">
                      ${user.estimatedValue.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {!isLoading && (!leaderboardData || leaderboardData.length === 0) && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <p className="text-gray-500 text-lg">No data available yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Start trading to see the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
}
