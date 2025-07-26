// Email Intel Hub Configuration - Enhanced with environment support and validation

const path = require('path');
const fs = require('fs');

// Environment-based configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';

const CONFIG = {
    // Environment settings
    ENVIRONMENT: {
        NODE_ENV,
        IS_PRODUCTION,
        IS_DEVELOPMENT,
        PORT: parseInt(process.env.PORT) || 3000,
        HOST: process.env.HOST || 'localhost'
    },

    // Performance settings
    PERFORMANCE: {
        CACHE_TTL: IS_PRODUCTION ? 3600000 : 300000, // 1 hour in prod, 5 min in dev
        MAX_CACHE_SIZE: 1000,
        COMPRESSION_LEVEL: IS_PRODUCTION ? 6 : 1,
        RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
        RATE_LIMIT_MAX: IS_PRODUCTION ? 100 : 1000, // More lenient in dev
        UPLOAD_RATE_LIMIT: IS_PRODUCTION ? 10 : 50,
        CONCURRENT_ANALYSIS_LIMIT: 3,
        REQUEST_TIMEOUT: 30000
    },

    // Security settings
    SECURITY: {
        ENABLE_RATE_LIMITING: true,
        ENABLE_HELMET: true,
        ENABLE_CORS: true,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_FILES_PER_UPLOAD: 10,
        ALLOWED_FILE_EXTENSIONS: ['.eml', '.msg', '.txt', '.mbox'],
        SANITIZE_FILENAMES: true,
        VALIDATE_FILE_CONTENT: true
    },
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
    },

    // Enhanced configuration validation
    validateConfig() {
        const errors = [];

        // Validate required environment variables
        if (CONFIG.ENVIRONMENT.IS_PRODUCTION) {
            const requiredEnvVars = ['PORT', 'NODE_ENV'];
            requiredEnvVars.forEach(envVar => {
                if (!process.env[envVar]) {
                    errors.push(`Missing required environment variable: ${envVar}`);
                }
            });
        }

        // Validate performance settings
        if (CONFIG.PERFORMANCE.RATE_LIMIT_MAX < 1) {
            errors.push('RATE_LIMIT_MAX must be greater than 0');
        }

        if (CONFIG.SECURITY.MAX_FILE_SIZE < 1024) {
            errors.push('MAX_FILE_SIZE must be at least 1KB');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Get configuration value with fallback
    get(path, fallback = null) {
        const keys = path.split('.');
        let value = CONFIG;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return fallback;
            }
        }

        return value;
    },

    // Check if file extension is allowed
    isAllowedFileExtension(filename) {
        const ext = require('path').extname(filename).toLowerCase();
        return CONFIG.SECURITY.ALLOWED_FILE_EXTENSIONS.includes(ext);
    },

    // Get risk level color for UI
    getRiskLevelColor(riskScore) {
        if (riskScore >= 80) return CONFIG.DASHBOARD.CHART_COLORS.DANGER;
        if (riskScore >= 60) return CONFIG.DASHBOARD.CHART_COLORS.WARNING;
        if (riskScore >= 30) return CONFIG.DASHBOARD.CHART_COLORS.SECONDARY;
        return CONFIG.DASHBOARD.CHART_COLORS.SUCCESS;
    },

    // Format time range for queries
    formatTimeRange(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case '1h':
                return new Date(now.getTime() - 60 * 60 * 1000);
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    },

    // Sanitize filename for security
    sanitizeFilename(filename) {
        if (!CONFIG.SECURITY.SANITIZE_FILENAMES) {
            return filename;
        }

        // Remove dangerous characters and limit length
        return filename
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 255);
    },

    // Get performance metrics
    getPerformanceConfig() {
        return {
            cacheEnabled: CONFIG.PERFORMANCE.CACHE_TTL > 0,
            compressionEnabled: CONFIG.PERFORMANCE.COMPRESSION_LEVEL > 0,
            rateLimitEnabled: CONFIG.SECURITY.ENABLE_RATE_LIMITING,
            maxCacheSize: CONFIG.PERFORMANCE.MAX_CACHE_SIZE,
            requestTimeout: CONFIG.PERFORMANCE.REQUEST_TIMEOUT
        };
    },

    // Environment-specific logging
    logPerformance(operation, duration, metadata = {}) {
        if (CONFIG.DEBUG.PERFORMANCE_LOGGING) {
            this.log('info', `Performance: ${operation} completed in ${duration}ms`, {
                operation,
                duration,
                ...metadata,
                environment: CONFIG.ENVIRONMENT.NODE_ENV
            });
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ConfigUtils };
}
