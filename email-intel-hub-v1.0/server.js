// Email Intel Hub - Express.js Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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
    }
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.eml', '.msg', '.txt', '.mbox'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .eml, .msg, .txt, and .mbox files are allowed.'));
        }
    }
});

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
app.post('/api/upload', upload.array('emails', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = [];
        
        for (const file of req.files) {
            try {
                // Read file content
                const content = fs.readFileSync(file.path, 'utf8');
                
                // Create email object for analysis
                const emailObj = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    filename: file.originalname,
                    size: file.size,
                    uploadTime: new Date().toISOString(),
                    content: content
                };

                // Store email data
                emailData.push(emailObj);

                // Simulate analysis (in a real app, this would use the EmailIntelAgent)
                const analysis = {
                    id: emailObj.id,
                    filename: file.originalname,
                    riskScore: Math.floor(Math.random() * 100),
                    threats: {
                        phishing: Math.random() > 0.7,
                        malware: Math.random() > 0.8,
                        spam: Math.random() > 0.6
                    },
                    sentiment: (Math.random() - 0.5) * 2, // -1 to 1
                    topics: ['business', 'urgent', 'payment'].slice(0, Math.floor(Math.random() * 3) + 1),
                    timestamp: new Date().toISOString()
                };

                analysisResults.push(analysis);
                results.push(analysis);

                // Clean up uploaded file
                fs.unlinkSync(file.path);

            } catch (error) {
                console.error('Error processing file:', file.originalname, error);
                results.push({
                    filename: file.originalname,
                    error: 'Failed to process file'
                });
            }
        }

        res.json({
            success: true,
            message: `Processed ${results.length} files`,
            results: results
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to process upload',
            message: error.message
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
