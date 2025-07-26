// Email Intel Hub Configuration

const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:3000',
        ENDPOINTS: {
            EMAILS: '/api/emails',
            ANALYSIS: '/api/analysis',
            INTELLIGENCE: '/api/intelligence',
            THREATS: '/api/threats',
            CONNECT: '/api/connect',
            UPLOAD: '/api/upload'
        }
    },

    // Email Provider Settings
    EMAIL_PROVIDERS: {
        gmail: {
            name: 'Gmail',
            imap: {
                host: 'imap.gmail.com',
                port: 993,
                secure: true
            },
            smtp: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false
            }
        },
        outlook: {
            name: 'Outlook',
            imap: {
                host: 'outlook.office365.com',
                port: 993,
                secure: true
            },
            smtp: {
                host: 'smtp.office365.com',
                port: 587,
                secure: false
            }
        },
        imap: {
            name: 'Custom IMAP',
            imap: {
                host: '',
                port: 993,
                secure: true
            },
            smtp: {
                host: '',
                port: 587,
                secure: false
            }
        }
    },

    // AI Analysis Settings
    AI: {
        SENTIMENT_THRESHOLD: 0.5,
        THREAT_CONFIDENCE_THRESHOLD: 0.7,
        MAX_ANALYSIS_BATCH_SIZE: 50,
        ANALYSIS_TIMEOUT: 30000, // 30 seconds
        
        // Analysis Categories
        CATEGORIES: {
            PHISHING: 'phishing',
            SPAM: 'spam',
            MALWARE: 'malware',
            SOCIAL_ENGINEERING: 'social_engineering',
            BUSINESS_EMAIL_COMPROMISE: 'bec',
            LEGITIMATE: 'legitimate'
        },

        // Risk Levels
        RISK_LEVELS: {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        }
    },

    // Dashboard Settings
    DASHBOARD: {
        REFRESH_INTERVAL: 30000, // 30 seconds
        MAX_RECENT_ACTIVITIES: 10,
        DEFAULT_TIME_RANGE: '7d',
        
        // Chart Colors
        CHART_COLORS: {
            PRIMARY: '#2563eb',
            SUCCESS: '#10b981',
            WARNING: '#f59e0b',
            DANGER: '#ef4444',
            SECONDARY: '#64748b'
        }
    },

    // File Upload Settings
    UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.eml', '.msg', '.txt', '.mbox'],
        MAX_FILES_PER_UPLOAD: 10
    },

    // Intelligence Analysis Settings
    INTELLIGENCE: {
        // Sentiment Analysis
        SENTIMENT: {
            VERY_NEGATIVE: -1,
            NEGATIVE: -0.5,
            NEUTRAL: 0,
            POSITIVE: 0.5,
            VERY_POSITIVE: 1
        },

        // Topic Modeling
        TOPICS: {
            MIN_TOPIC_FREQUENCY: 3,
            MAX_TOPICS: 10,
            STOP_WORDS: [
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
                'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
                'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
                'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
                'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
                'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
                'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
                'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but',
                'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
                'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
                'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
                'under', 'again', 'further', 'then', 'once'
            ]
        },

        // Communication Patterns
        PATTERNS: {
            TIME_SLOTS: ['morning', 'afternoon', 'evening', 'night'],
            FREQUENCY_THRESHOLDS: {
                LOW: 5,
                MEDIUM: 20,
                HIGH: 50
            }
        }
    },

    // Threat Detection Settings
    THREATS: {
        // Phishing Indicators
        PHISHING_KEYWORDS: [
            'urgent', 'immediate', 'verify', 'suspend', 'click here', 'act now',
            'limited time', 'expires', 'confirm', 'update', 'security alert',
            'account locked', 'unusual activity', 'verify identity'
        ],

        // Suspicious Domains
        SUSPICIOUS_DOMAINS: [
            'bit.ly', 'tinyurl.com', 'goo.gl', 't.co'
        ],

        // Malware File Extensions
        MALWARE_EXTENSIONS: [
            '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js',
            '.jar', '.zip', '.rar', '.7z', '.docm', '.xlsm', '.pptm'
        ]
    },

    // Notification Settings
    NOTIFICATIONS: {
        ENABLED: true,
        TYPES: {
            THREAT_DETECTED: 'threat_detected',
            ANALYSIS_COMPLETE: 'analysis_complete',
            CONNECTION_ERROR: 'connection_error',
            SYSTEM_UPDATE: 'system_update'
        },
        DISPLAY_DURATION: 5000 // 5 seconds
    },

    // Debug Settings
    DEBUG: {
        ENABLED: false,
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        CONSOLE_OUTPUT: true
    }
};

// Utility Functions
const ConfigUtils = {
    // Get API endpoint URL
    getApiUrl: (endpoint) => {
        return `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS[endpoint]}`;
    },

    // Get email provider configuration
    getEmailProvider: (provider) => {
        return CONFIG.EMAIL_PROVIDERS[provider] || null;
    },

    // Check if file extension is allowed
    isAllowedFileExtension: (filename) => {
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return CONFIG.UPLOAD.ALLOWED_EXTENSIONS.includes(extension);
    },

    // Get risk level color
    getRiskLevelColor: (riskLevel) => {
        const colors = {
            [CONFIG.AI.RISK_LEVELS.LOW]: CONFIG.DASHBOARD.CHART_COLORS.SUCCESS,
            [CONFIG.AI.RISK_LEVELS.MEDIUM]: CONFIG.DASHBOARD.CHART_COLORS.WARNING,
            [CONFIG.AI.RISK_LEVELS.HIGH]: CONFIG.DASHBOARD.CHART_COLORS.DANGER,
            [CONFIG.AI.RISK_LEVELS.CRITICAL]: '#dc2626'
        };
        return colors[riskLevel] || CONFIG.DASHBOARD.CHART_COLORS.SECONDARY;
    },

    // Format time range for API calls
    formatTimeRange: (range) => {
        const now = new Date();
        const ranges = {
            '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
            '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        };
        return ranges[range] || ranges['7d'];
    },

    // Log debug messages
    log: (level, message, data = null) => {
        if (!CONFIG.DEBUG.ENABLED) return;
        
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(CONFIG.DEBUG.LOG_LEVEL);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex >= currentLevelIndex && CONFIG.DEBUG.CONSOLE_OUTPUT) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            
            if (data) {
                console[level](logMessage, data);
            } else {
                console[level](logMessage);
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ConfigUtils };
}
