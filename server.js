// Email Intel Hub - Express.js Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const validator = require('validator');
require('dotenv').config();

// Import custom modules
const EmailIntelAgent = require('./email-intel-agent');
const EmailParser = require('./email-parser');
const { ConfigUtils } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize core components
const emailIntelAgent = new EmailIntelAgent();
const emailParser = new EmailParser();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 uploads per windowMs
    message: {
        error: 'Too many uploads from this IP, please try again later.',
        retryAfter: '15 minutes'
    }
});

// Middleware
app.use(compression()); // Enable gzip compression
app.use(limiter); // Apply rate limiting to all requests

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Allow embedding for dashboard
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com'] // Replace with your production domain
        : true,
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        // Verify JSON payload integrity
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: 'Invalid JSON payload' });
            return;
        }
    }
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000 // Limit number of parameters
}));

// Serve static files
app.use(express.static('.', {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0, // Cache static files in production
    etag: true,
    lastModified: true
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadDir = './uploads';
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Sanitize filename
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + sanitizedName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10, // Maximum 10 files
        fields: 10 // Maximum 10 fields
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.eml', '.msg', '.txt', '.mbox'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // Additional security checks
        if (!file.originalname || file.originalname.length > 255) {
            return cb(new Error('Invalid filename length'));
        }

        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .eml, .msg, .txt, and .mbox files are allowed.'));
        }
    }
});

// Enhanced error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: 'File too large. Maximum size is 10MB.',
                    code: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Too many files. Maximum is 10 files.',
                    code: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Unexpected file field.',
                    code: 'UNEXPECTED_FILE'
                });
            default:
                return res.status(400).json({
                    error: 'File upload error.',
                    code: 'UPLOAD_ERROR'
                });
        }
    }

    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: error.message,
            code: 'INVALID_FILE_TYPE'
        });
    }

    next(error);
};

// In-memory storage for demo (in production, use a database)
let analysisResults = [];
let emailData = [];

// Routes

// Serve main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Upload and analyze emails
app.post('/api/upload', uploadLimiter, upload.array('emails', 10), handleMulterError, async (req, res) => {
    const startTime = Date.now();

    try {
        // Validate request
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No files uploaded',
                code: 'NO_FILES'
            });
        }

        // Initialize EmailIntelAgent if not already done
        if (!emailIntelAgent.isInitialized) {
            await emailIntelAgent.initialize();
        }

        const results = [];
        const errors = [];

        // Process files concurrently with limit
        const processFile = async (file) => {
            try {
                // Validate file size and type again
                if (file.size === 0) {
                    throw new Error('Empty file');
                }

                // Read file content asynchronously
                const content = await fs.readFile(file.path, 'utf8');

                // Validate content
                if (!content || content.trim().length === 0) {
                    throw new Error('File contains no content');
                }

                // Parse email using EmailParser
                const parsedEmail = await emailParser.parseEmail(content, file.originalname);

                // Create email object for analysis
                const emailObj = {
                    id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    filename: file.originalname,
                    size: file.size,
                    uploadTime: new Date().toISOString(),
                    content: content,
                    parsed: parsedEmail
                };

                // Store email data
                emailData.push(emailObj);

                // Perform real analysis using EmailIntelAgent
                const analysis = await emailIntelAgent.analyzeEmail(parsedEmail);

                // Enhance analysis with file metadata
                analysis.metadata = {
                    filename: file.originalname,
                    fileSize: file.size,
                    uploadTime: emailObj.uploadTime,
                    processingTime: Date.now() - startTime
                };

                analysisResults.push(analysis);

                return {
                    success: true,
                    filename: file.originalname,
                    analysis: analysis
                };

            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
                return {
                    success: false,
                    filename: file.originalname,
                    error: error.message,
                    code: 'PROCESSING_ERROR'
                };
            } finally {
                // Clean up uploaded file
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.error(`Failed to delete file ${file.path}:`, unlinkError);
                }
            }
        };

        // Process files with concurrency limit
        const concurrencyLimit = 3;
        for (let i = 0; i < req.files.length; i += concurrencyLimit) {
            const batch = req.files.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(batch.map(processFile));

            batchResults.forEach(result => {
                if (result.success) {
                    results.push(result);
                } else {
                    errors.push(result);
                }
            });
        }

        const totalProcessingTime = Date.now() - startTime;

        // Return comprehensive response
        res.json({
            success: true,
            message: `Processed ${results.length} files successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
            results: results.map(r => r.analysis),
            errors: errors,
            metadata: {
                totalFiles: req.files.length,
                successfulFiles: results.length,
                failedFiles: errors.length,
                processingTime: totalProcessingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to process upload',
            message: error.message,
            code: 'UPLOAD_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// Get analysis results
app.get('/api/analysis', (req, res) => {
    const { timeRange = '7d', limit = 50 } = req.query;
    
    // Filter by time range
    const cutoffDate = new Date();
    switch (timeRange) {
        case '24h':
            cutoffDate.setHours(cutoffDate.getHours() - 24);
            break;
        case '7d':
            cutoffDate.setDate(cutoffDate.getDate() - 7);
            break;
        case '30d':
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            break;
        case '90d':
            cutoffDate.setDate(cutoffDate.getDate() - 90);
            break;
    }

    const filteredResults = analysisResults
        .filter(result => new Date(result.timestamp) >= cutoffDate)
        .slice(0, parseInt(limit));

    res.json({
        results: filteredResults,
        total: filteredResults.length,
        timeRange: timeRange
    });
});

// Get dashboard statistics
app.get('/api/stats', (req, res) => {
    const { timeRange = '7d' } = req.query;
    
    // Filter by time range
    const cutoffDate = new Date();
    switch (timeRange) {
        case '24h':
            cutoffDate.setHours(cutoffDate.getHours() - 24);
            break;
        case '7d':
            cutoffDate.setDate(cutoffDate.getDate() - 7);
            break;
        case '30d':
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            break;
        case '90d':
            cutoffDate.setDate(cutoffDate.getDate() - 90);
            break;
    }

    const recentResults = analysisResults.filter(result => 
        new Date(result.timestamp) >= cutoffDate
    );

    const stats = {
        totalEmails: recentResults.length,
        threatsDetected: recentResults.filter(r => 
            r.threats.phishing || r.threats.malware || r.threats.spam
        ).length,
        averageRiskScore: recentResults.length > 0 
            ? Math.round(recentResults.reduce((sum, r) => sum + r.riskScore, 0) / recentResults.length)
            : 0,
        averageSentiment: recentResults.length > 0
            ? (recentResults.reduce((sum, r) => sum + r.sentiment, 0) / recentResults.length).toFixed(2)
            : 0,
        threatBreakdown: {
            phishing: recentResults.filter(r => r.threats.phishing).length,
            malware: recentResults.filter(r => r.threats.malware).length,
            spam: recentResults.filter(r => r.threats.spam).length
        },
        timeRange: timeRange
    };

    res.json(stats);
});

// Get intelligence insights
app.get('/api/intelligence', (req, res) => {
    const insights = {
        topTopics: ['business', 'urgent', 'payment', 'security', 'account'],
        sentimentTrend: [
            { date: '2024-01-20', sentiment: 0.2 },
            { date: '2024-01-21', sentiment: -0.1 },
            { date: '2024-01-22', sentiment: 0.3 },
            { date: '2024-01-23', sentiment: 0.1 },
            { date: '2024-01-24', sentiment: -0.2 }
        ],
        communicationPatterns: {
            peakHours: ['9:00', '14:00', '16:00'],
            busyDays: ['Monday', 'Tuesday', 'Wednesday']
        },
        riskAssessment: {
            low: analysisResults.filter(r => r.riskScore < 25).length,
            medium: analysisResults.filter(r => r.riskScore >= 25 && r.riskScore < 50).length,
            high: analysisResults.filter(r => r.riskScore >= 50 && r.riskScore < 75).length,
            critical: analysisResults.filter(r => r.riskScore >= 75).length
        }
    };

    res.json(insights);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 10 files per upload.' });
        }
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Email Intel Hub server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
