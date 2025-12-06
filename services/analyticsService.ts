
export const analyticsService = {
    logEvent: (eventName: string, properties: Record<string, any> = {}) => {
        // In a real app, this would send data to Mixpanel/PostHog/GA
        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
            console.log(`[Analytics] ${eventName}`, properties);
        }
        
        // Simple local storage counter for "feature adoption" check
        try {
            const stats = JSON.parse(localStorage.getItem('aasani_usage_stats') || '{}');
            stats[eventName] = (stats[eventName] || 0) + 1;
            localStorage.setItem('aasani_usage_stats', JSON.stringify(stats));
        } catch (e) {
            // Ignore storage errors
        }
    },

    getFeatureUsage: () => {
        try {
            return JSON.parse(localStorage.getItem('aasani_usage_stats') || '{}');
        } catch (e) {
            return {};
        }
    }
};
