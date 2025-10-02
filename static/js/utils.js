// Utility functions
const UTILS = {
    // Shift mapping
    SHIFT_MAP: {
        "M2": "8 AM – 5 PM",
        "M3": "9 AM – 6 PM",
        "M4": "10 AM – 7 PM",
        "D1": "12 PM – 9 PM",
        "D2": "1 PM – 10 PM",
        "DO": "OFF",
        "SL": "Sick Leave",
        "CL": "Casual Leave",
        "EL": "Emergency Leave",
        "": "N/A"
    },

    // Google Sheets CSV URLs
    GOOGLE_SHEETS_URLS: [
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUUnqdxxc2BxcRN-N10Ehjes78p2EuerKLCl_20hlMDH-Bv2O2umXP37SIeX20yvxiKOYpWJtWsbfq/pub?gid=0&single=true&output=csv",
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUUnqdxxc2BxcRN-N10Ehjes78p2EuerKLCl_20hlMDH-Bv2O2umXP37SIeX20yvxiKOYpWJtWsbfq/pub?gid=1904501448&single=true&output=csv"
    ],

    // Format date to match CSV headers
    formatDateForHeader(date) {
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' });
        return `${day}${month}`;
    },

    // Find matching date in headers
    findMatchingDate(dateString, dateHeaders) {
        // Try exact match first
        if (dateHeaders.includes(dateString)) {
            return dateString;
        }
        
        // Try case-insensitive match
        const lowerDateString = dateString.toLowerCase();
        for (const header of dateHeaders) {
            if (header.toLowerCase() === lowerDateString) {
                return header;
            }
        }
        
        // Try partial match
        for (const header of dateHeaders) {
            if (header.includes(dateString) || dateString.includes(header)) {
                return header;
            }
        }
        
        console.warn('No matching date found for:', dateString);
        return dateString;
    },

    // Get shift display text
    getShiftDisplay(shiftCode) {
        return this.SHIFT_MAP[shiftCode] || shiftCode;
    },

    // Debounce function for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Implementation for showing notifications
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};