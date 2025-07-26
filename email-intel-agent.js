// Email Intelligence Agent - AI-powered email analysis and threat detection

class EmailIntelAgent {
    constructor() {
        this.parser = new EmailParser();
        this.analysisCache = new Map();
        this.threatDatabase = new Map();
        this.learningData = [];
        this.isInitialized = false;
    }

    // Initialize the agent
    async initialize() {
        try {
            ConfigUtils.log('info', 'Initializing Email Intel Agent');
            
            // Load threat signatures and patterns
            await this.loadThreatSignatures();
            
            // Initialize sentiment analysis
            this.initializeSentimentAnalysis();
            
            // Load machine learning models (simulated)
            await this.loadMLModels();
            
            this.isInitialized = true;
            ConfigUtils.log('info', 'Email Intel Agent initialized successfully');
        } catch (error) {
            ConfigUtils.log('error', 'Failed to initialize Email Intel Agent', error);
            throw error;
        }
    }

    // Analyze a single email
    async analyzeEmail(email) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            ConfigUtils.log('info', 'Analyzing email', { subject: email.headers?.subject });

            const analysis = {
                id: this.generateAnalysisId(),
                timestamp: new Date().toISOString(),
                email: email,
                results: {
                    threatAssessment: await this.assessThreats(email),
                    sentimentAnalysis: this.analyzeSentiment(email),
                    topicExtraction: this.extractTopics(email),
                    entityRecognition: this.recognizeEntities(email),
                    communicationPatterns: this.analyzeCommunicationPatterns(email),
                    riskScore: 0,
                    category: CONFIG.AI.CATEGORIES.LEGITIMATE,
                    confidence: 0
                }
            };

            // Calculate overall risk score and category
            analysis.results = await this.calculateOverallAssessment(analysis.results);

            // Cache the analysis
            this.analysisCache.set(analysis.id, analysis);

            // Learn from this analysis
            this.addToLearningData(analysis);

            ConfigUtils.log('info', 'Email analysis completed', {
                id: analysis.id,
                riskScore: analysis.results.riskScore,
                category: analysis.results.category
            });

            return analysis;
        } catch (error) {
            ConfigUtils.log('error', 'Error analyzing email', error);
            throw error;
        }
    }

    // Analyze multiple emails in batch
    async analyzeEmailBatch(emails) {
        const batchSize = CONFIG.AI.MAX_ANALYSIS_BATCH_SIZE;
        const results = [];

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchPromises = batch.map(email => this.analyzeEmail(email));
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                ConfigUtils.log('error', 'Error in batch analysis', { batchIndex: i / batchSize, error });
                // Continue with next batch even if one fails
            }
        }

        return results;
    }

    // Assess threats in email
    async assessThreats(email) {
        const threats = {
            phishing: { detected: false, confidence: 0, indicators: [] },
            malware: { detected: false, confidence: 0, indicators: [] },
            spam: { detected: false, confidence: 0, indicators: [] },
            socialEngineering: { detected: false, confidence: 0, indicators: [] },
            businessEmailCompromise: { detected: false, confidence: 0, indicators: [] }
        };

        // Phishing detection
        threats.phishing = await this.detectPhishing(email);
        
        // Malware detection
        threats.malware = await this.detectMalware(email);
        
        // Spam detection
        threats.spam = await this.detectSpam(email);
        
        // Social engineering detection
        threats.socialEngineering = await this.detectSocialEngineering(email);
        
        // Business Email Compromise detection
        threats.businessEmailCompromise = await this.detectBEC(email);

        return threats;
    }

    // Detect phishing attempts
    async detectPhishing(email) {
        const indicators = [];
        let confidence = 0;

        const content = (email.body + ' ' + (email.headers.subject || '')).toLowerCase();

        // Check for phishing keywords
        CONFIG.THREATS.PHISHING_KEYWORDS.forEach(keyword => {
            if (content.includes(keyword.toLowerCase())) {
                indicators.push(`Phishing keyword: ${keyword}`);
                confidence += 0.1;
            }
        });

        // Check for suspicious URLs
        if (email.metadata?.urls) {
            email.metadata.urls.forEach(url => {
                try {
                    const urlObj = new URL(url);
                    
                    // Check for URL shorteners
                    if (CONFIG.THREATS.SUSPICIOUS_DOMAINS.includes(urlObj.hostname)) {
                        indicators.push(`Suspicious domain: ${urlObj.hostname}`);
                        confidence += 0.15;
                    }
                    
                    // Check for suspicious URL patterns
                    if (this.isSuspiciousURL(url)) {
                        indicators.push(`Suspicious URL pattern: ${url}`);
                        confidence += 0.2;
                    }
                } catch (e) {
                    // Invalid URL
                    indicators.push(`Malformed URL: ${url}`);
                    confidence += 0.1;
                }
            });
        }

        // Check for domain spoofing
        if (email.headers.from) {
            const fromDomain = this.parser.extractDomainFromEmail(email.headers.from);
            if (fromDomain && this.isSpoofedDomain(fromDomain)) {
                indicators.push(`Potential domain spoofing: ${fromDomain}`);
                confidence += 0.3;
            }
        }

        // Check for urgency indicators
        const urgencyWords = ['urgent', 'immediate', 'asap', 'expires', 'deadline'];
        urgencyWords.forEach(word => {
            if (content.includes(word)) {
                indicators.push(`Urgency indicator: ${word}`);
                confidence += 0.05;
            }
        });

        confidence = Math.min(1, confidence);
        const detected = confidence >= CONFIG.AI.THREAT_CONFIDENCE_THRESHOLD;

        return { detected, confidence, indicators };
    }

    // Detect malware
    async detectMalware(email) {
        const indicators = [];
        let confidence = 0;

        // Check attachments for malware signatures
        if (email.attachments) {
            email.attachments.forEach(attachment => {
                const extension = this.parser.getFileExtension(attachment.filename || '');
                
                if (CONFIG.THREATS.MALWARE_EXTENSIONS.includes(extension)) {
                    indicators.push(`Suspicious file extension: ${extension}`);
                    confidence += 0.4;
                }

                // Check for double extensions
                if (this.hasDoubleExtension(attachment.filename)) {
                    indicators.push(`Double extension detected: ${attachment.filename}`);
                    confidence += 0.3;
                }
            });
        }

        // Check for malware-related keywords
        const malwareKeywords = ['download', 'install', 'run', 'execute', 'macro', 'enable'];
        const content = (email.body || '').toLowerCase();
        
        malwareKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
                indicators.push(`Malware keyword: ${keyword}`);
                confidence += 0.05;
            }
        });

        confidence = Math.min(1, confidence);
        const detected = confidence >= CONFIG.AI.THREAT_CONFIDENCE_THRESHOLD;

        return { detected, confidence, indicators };
    }

    // Detect spam
    async detectSpam(email) {
        const indicators = [];
        let confidence = 0;

        const content = (email.body + ' ' + (email.headers.subject || '')).toLowerCase();

        // Check for spam keywords
        const spamKeywords = [
            'free', 'win', 'winner', 'congratulations', 'prize', 'lottery',
            'money', 'cash', 'earn', 'income', 'investment', 'guarantee',
            'limited time', 'act now', 'call now', 'click here'
        ];

        spamKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
                indicators.push(`Spam keyword: ${keyword}`);
                confidence += 0.08;
            }
        });

        // Check for excessive capitalization
        const capsRatio = this.calculateCapsRatio(email.body || '');
        if (capsRatio > 0.3) {
            indicators.push(`Excessive capitalization: ${Math.round(capsRatio * 100)}%`);
            confidence += 0.2;
        }

        // Check for excessive punctuation
        const punctuationRatio = this.calculatePunctuationRatio(email.body || '');
        if (punctuationRatio > 0.1) {
            indicators.push(`Excessive punctuation: ${Math.round(punctuationRatio * 100)}%`);
            confidence += 0.15;
        }

        confidence = Math.min(1, confidence);
        const detected = confidence >= CONFIG.AI.THREAT_CONFIDENCE_THRESHOLD;

        return { detected, confidence, indicators };
    }

    // Detect social engineering
    async detectSocialEngineering(email) {
        const indicators = [];
        let confidence = 0;

        const content = (email.body + ' ' + (email.headers.subject || '')).toLowerCase();

        // Check for social engineering tactics
        const seKeywords = [
            'verify', 'confirm', 'update', 'suspend', 'locked', 'security',
            'unauthorized', 'unusual activity', 'click here', 'login'
        ];

        seKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
                indicators.push(`Social engineering keyword: ${keyword}`);
                confidence += 0.1;
            }
        });

        // Check for authority impersonation
        const authorityKeywords = ['bank', 'paypal', 'amazon', 'microsoft', 'google', 'apple'];
        authorityKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
                indicators.push(`Authority impersonation: ${keyword}`);
                confidence += 0.15;
            }
        });

        confidence = Math.min(1, confidence);
        const detected = confidence >= CONFIG.AI.THREAT_CONFIDENCE_THRESHOLD;

        return { detected, confidence, indicators };
    }

    // Detect Business Email Compromise
    async detectBEC(email) {
        const indicators = [];
        let confidence = 0;

        const content = (email.body || '').toLowerCase();
        const subject = (email.headers.subject || '').toLowerCase();

        // Check for BEC keywords
        const becKeywords = [
            'wire transfer', 'payment', 'invoice', 'urgent payment', 'bank details',
            'account change', 'vendor', 'supplier', 'ceo', 'president', 'urgent request'
        ];

        becKeywords.forEach(keyword => {
            if (content.includes(keyword) || subject.includes(keyword)) {
                indicators.push(`BEC keyword: ${keyword}`);
                confidence += 0.15;
            }
        });

        // Check for executive impersonation
        const executiveTitles = ['ceo', 'cfo', 'president', 'director', 'manager'];
        const fromField = (email.headers.from || '').toLowerCase();
        
        executiveTitles.forEach(title => {
            if (fromField.includes(title)) {
                indicators.push(`Executive impersonation: ${title}`);
                confidence += 0.2;
            }
        });

        confidence = Math.min(1, confidence);
        const detected = confidence >= CONFIG.AI.THREAT_CONFIDENCE_THRESHOLD;

        return { detected, confidence, indicators };
    }

    // Analyze sentiment
    analyzeSentiment(email) {
        const content = email.body || '';
        
        // Simple sentiment analysis (in production, use a proper NLP library)
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'sad', 'upset'];
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        const words = content.toLowerCase().split(/\s+/);
        
        words.forEach(word => {
            if (positiveWords.includes(word)) positiveScore++;
            if (negativeWords.includes(word)) negativeScore++;
        });
        
        const totalWords = words.length;
        const sentiment = totalWords > 0 ? (positiveScore - negativeScore) / totalWords : 0;
        
        return {
            score: Math.max(-1, Math.min(1, sentiment)),
            positive: positiveScore,
            negative: negativeScore,
            neutral: totalWords - positiveScore - negativeScore
        };
    }

    // Extract topics from email
    extractTopics(email) {
        const content = (email.body || '').toLowerCase();
        const words = content.split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !CONFIG.INTELLIGENCE.TOPICS.STOP_WORDS.includes(word));
        
        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        const topics = Object.entries(wordFreq)
            .filter(([word, freq]) => freq >= CONFIG.INTELLIGENCE.TOPICS.MIN_TOPIC_FREQUENCY)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.INTELLIGENCE.TOPICS.MAX_TOPICS)
            .map(([word, freq]) => ({ topic: word, frequency: freq }));
        
        return topics;
    }

    // Recognize entities in email
    recognizeEntities(email) {
        const entities = {
            emails: email.metadata?.emailAddresses || [],
            urls: email.metadata?.urls || [],
            ips: email.metadata?.ipAddresses || [],
            domains: email.metadata?.domains || [],
            phoneNumbers: [],
            organizations: [],
            locations: []
        };

        const content = email.body || '';
        
        // Extract phone numbers
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        entities.phoneNumbers = content.match(phoneRegex) || [];
        
        // Simple organization detection (would use NER in production)
        const orgKeywords = ['inc', 'corp', 'llc', 'ltd', 'company', 'corporation'];
        const words = content.split(/\s+/);
        
        for (let i = 0; i < words.length - 1; i++) {
            if (orgKeywords.some(keyword => words[i + 1].toLowerCase().includes(keyword))) {
                entities.organizations.push(words[i] + ' ' + words[i + 1]);
            }
        }

        return entities;
    }

    // Analyze communication patterns
    analyzeCommunicationPatterns(email) {
        return {
            timeSlot: email.metadata?.timeSlot,
            dayOfWeek: email.metadata?.dayOfWeek,
            isReply: email.metadata?.isReply || false,
            isForward: email.metadata?.isForward || false,
            threadDepth: email.metadata?.threadDepth || 0,
            responseTime: null, // Would calculate based on thread history
            communicationFrequency: null // Would calculate based on sender history
        };
    }

    // Calculate overall assessment
    async calculateOverallAssessment(results) {
        let riskScore = 0;
        let category = CONFIG.AI.CATEGORIES.LEGITIMATE;
        let confidence = 0;

        // Weight threat assessments
        const threatWeights = {
            phishing: 0.3,
            malware: 0.25,
            spam: 0.15,
            socialEngineering: 0.2,
            businessEmailCompromise: 0.1
        };

        Object.entries(results.threatAssessment).forEach(([threatType, assessment]) => {
            if (assessment.detected) {
                const weight = threatWeights[threatType] || 0.1;
                riskScore += assessment.confidence * weight * 100;
                
                if (assessment.confidence > confidence) {
                    confidence = assessment.confidence;
                    category = this.mapThreatToCategory(threatType);
                }
            }
        });

        // Adjust based on sentiment (very negative sentiment increases risk)
        if (results.sentimentAnalysis.score < -0.5) {
            riskScore += 10;
        }

        // Normalize risk score
        riskScore = Math.min(100, Math.max(0, riskScore));

        // Determine risk level
        let riskLevel;
        if (riskScore < 25) riskLevel = CONFIG.AI.RISK_LEVELS.LOW;
        else if (riskScore < 50) riskLevel = CONFIG.AI.RISK_LEVELS.MEDIUM;
        else if (riskScore < 75) riskLevel = CONFIG.AI.RISK_LEVELS.HIGH;
        else riskLevel = CONFIG.AI.RISK_LEVELS.CRITICAL;

        return {
            ...results,
            riskScore,
            riskLevel,
            category,
            confidence
        };
    }

    // Helper methods
    generateAnalysisId() {
        return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    mapThreatToCategory(threatType) {
        const mapping = {
            phishing: CONFIG.AI.CATEGORIES.PHISHING,
            malware: CONFIG.AI.CATEGORIES.MALWARE,
            spam: CONFIG.AI.CATEGORIES.SPAM,
            socialEngineering: CONFIG.AI.CATEGORIES.SOCIAL_ENGINEERING,
            businessEmailCompromise: CONFIG.AI.CATEGORIES.BUSINESS_EMAIL_COMPROMISE
        };
        return mapping[threatType] || CONFIG.AI.CATEGORIES.LEGITIMATE;
    }

    isSuspiciousURL(url) {
        try {
            const urlObj = new URL(url);
            
            // Check for suspicious patterns
            if (urlObj.hostname.includes('xn--')) return true; // Punycode
            if (urlObj.hostname.split('.').length > 4) return true; // Too many subdomains
            if (urlObj.pathname.includes('..')) return true; // Directory traversal
            
            return false;
        } catch (e) {
            return true; // Invalid URL is suspicious
        }
    }

    isSpoofedDomain(domain) {
        // Simple spoofing detection (would use more sophisticated methods in production)
        const legitimateDomains = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com'];
        
        return legitimateDomains.some(legit => {
            const similarity = this.calculateStringSimilarity(domain, legit);
            return similarity > 0.8 && similarity < 1.0;
        });
    }

    hasDoubleExtension(filename) {
        if (!filename) return false;
        const parts = filename.split('.');
        return parts.length > 2 && CONFIG.THREATS.MALWARE_EXTENSIONS.includes('.' + parts[parts.length - 1]);
    }

    calculateCapsRatio(text) {
        if (!text) return 0;
        const caps = text.match(/[A-Z]/g) || [];
        const letters = text.match(/[A-Za-z]/g) || [];
        return letters.length > 0 ? caps.length / letters.length : 0;
    }

    calculatePunctuationRatio(text) {
        if (!text) return 0;
        const punctuation = text.match(/[!?.,;:]/g) || [];
        return text.length > 0 ? punctuation.length / text.length : 0;
    }

    calculateStringSimilarity(str1, str2) {
        // Simple Levenshtein distance-based similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Initialization helper methods
    async loadThreatSignatures() {
        // In production, this would load from a threat intelligence database
        ConfigUtils.log('info', 'Loading threat signatures');
        // Simulated loading
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    initializeSentimentAnalysis() {
        // In production, this would initialize a proper sentiment analysis model
        ConfigUtils.log('info', 'Initializing sentiment analysis');
    }

    async loadMLModels() {
        // In production, this would load pre-trained ML models
        ConfigUtils.log('info', 'Loading ML models');
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    addToLearningData(analysis) {
        // Store analysis for continuous learning
        this.learningData.push({
            timestamp: analysis.timestamp,
            features: this.extractFeatures(analysis.email),
            results: analysis.results
        });
        
        // Keep only recent learning data
        if (this.learningData.length > 1000) {
            this.learningData = this.learningData.slice(-1000);
        }
    }

    extractFeatures(email) {
        // Extract features for machine learning
        return {
            wordCount: email.metadata?.wordCount || 0,
            hasAttachments: email.metadata?.hasAttachments || false,
            urlCount: email.metadata?.urls?.length || 0,
            emailCount: email.metadata?.emailAddresses?.length || 0,
            capsRatio: this.calculateCapsRatio(email.body || ''),
            punctuationRatio: this.calculatePunctuationRatio(email.body || '')
        };
    }

    // Get analysis statistics
    getAnalysisStats() {
        const stats = {
            totalAnalyzed: this.analysisCache.size,
            threatsByCategory: {},
            riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
            averageRiskScore: 0
        };

        let totalRiskScore = 0;
        
        this.analysisCache.forEach(analysis => {
            const category = analysis.results.category;
            const riskLevel = analysis.results.riskLevel;
            
            stats.threatsByCategory[category] = (stats.threatsByCategory[category] || 0) + 1;
            stats.riskDistribution[riskLevel] = (stats.riskDistribution[riskLevel] || 0) + 1;
            totalRiskScore += analysis.results.riskScore;
        });

        if (stats.totalAnalyzed > 0) {
            stats.averageRiskScore = totalRiskScore / stats.totalAnalyzed;
        }

        return stats;
    }
}

    // Clear analysis cache
    clearCache() {
        this.analysisCache.clear();
        ConfigUtils.log('info', 'Analysis cache cleared');
    }

    // Get cached analysis
    getCachedAnalysis(id) {
        return this.analysisCache.get(id);
    }

    // Generate intelligence report
    generateIntelligenceReport(timeRange = '7d') {
        const analyses = Array.from(this.analysisCache.values());
        const cutoffDate = ConfigUtils.formatTimeRange(timeRange);

        const recentAnalyses = analyses.filter(analysis =>
            new Date(analysis.timestamp) >= cutoffDate
        );

        const report = {
            summary: {
                totalEmails: recentAnalyses.length,
                threatsDetected: recentAnalyses.filter(a => a.results.riskScore > 50).length,
                averageRiskScore: 0,
                topThreats: []
            },
            trends: {
                volumeByDay: {},
                threatsByType: {},
                sentimentTrend: []
            },
            insights: []
        };

        if (recentAnalyses.length > 0) {
            // Calculate average risk score
            const totalRisk = recentAnalyses.reduce((sum, a) => sum + a.results.riskScore, 0);
            report.summary.averageRiskScore = totalRisk / recentAnalyses.length;

            // Generate insights
            report.insights = this.generateInsights(recentAnalyses);
        }

        return report;
    }

    // Generate actionable insights
    generateInsights(analyses) {
        const insights = [];

        // High-risk email insight
        const highRiskEmails = analyses.filter(a => a.results.riskLevel === CONFIG.AI.RISK_LEVELS.HIGH ||
                                                   a.results.riskLevel === CONFIG.AI.RISK_LEVELS.CRITICAL);

        if (highRiskEmails.length > 0) {
            insights.push({
                type: 'threat',
                priority: 'high',
                title: `${highRiskEmails.length} High-Risk Emails Detected`,
                description: 'Multiple emails with high threat indicators require immediate attention.',
                action: 'Review and quarantine suspicious emails',
                emails: highRiskEmails.slice(0, 5).map(a => a.email.headers?.subject || 'No Subject')
            });
        }

        // Phishing trend insight
        const phishingEmails = analyses.filter(a => a.results.threatAssessment.phishing.detected);
        if (phishingEmails.length > 3) {
            insights.push({
                type: 'trend',
                priority: 'medium',
                title: 'Increased Phishing Activity',
                description: `${phishingEmails.length} phishing attempts detected in the selected time period.`,
                action: 'Enhance user training and email filtering',
                trend: 'increasing'
            });
        }

        return insights;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailIntelAgent;
}
