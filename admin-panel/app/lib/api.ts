export const analyticsAPI = {
  getAnalytics: async (period: string) => {
    console.log(`Fetching analytics for period: ${period}`);
    return {
      analytics: {
        totalUsers: 127,
        activeTrials: 45,
        paidSubscriptions: 82,
        totalRevenue: 12450
      }
    };
  }
}; 