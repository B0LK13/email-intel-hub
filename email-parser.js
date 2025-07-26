// Email Parser Module - Handles email parsing and preprocessing

class EmailParser {
    constructor() {
        this.supportedFormats = ['.eml', '.msg', '.txt', '.mbox'];
        this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        this.urlRegex = /(https?:\/\/[^\s]+)/g;
        this.ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    }

    // Parse email file content
    async parseEmailFile(file) {
        try {
            const content = await this.readFileContent(file);
            const extension = this.getFileExtension(file.name);
            
            switch (extension) {
                case '.eml':
                    return this.parseEMLFormat(content);
                case '.msg':
                    return this.parseMSGFormat(content);
                case '.txt':
                    return this.parsePlainTextFormat(content);
                case '.mbox':
                    return this.parseMboxFormat(content);
                default:
                    throw new Error(`Unsupported file format: ${extension}`);
            }
        } catch (error) {
            ConfigUtils.log('error', 'Error parsing email file', { file: file.name, error: error.message });
            throw error;
        }
    }

    // Read file content as text
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Get file extension
    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    // Parse EML format (RFC 2822)
    parseEMLFormat(content) {
        const email = {
            headers: {},
            body: '',
            attachments: [],
            metadata: {}
        };

        const lines = content.split('\n');
        let headerSection = true;
        let bodyLines = [];
        let currentHeader = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (headerSection) {
                if (line.trim() === '') {
                    headerSection = false;
                    continue;
                }

                // Handle multi-line headers
                if (line.startsWith(' ') || line.startsWith('\t')) {
                    if (currentHeader) {
                        email.headers[currentHeader] += ' ' + line.trim();
                    }
                } else {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        currentHeader = line.substring(0, colonIndex).toLowerCase();
                        email.headers[currentHeader] = line.substring(colonIndex + 1).trim();
                    }
                }
            } else {
                bodyLines.push(line);
            }
        }

        email.body = bodyLines.join('\n');
        return this.enrichEmailData(email);
    }

    // Parse MSG format (simplified - would need proper MSG parser in production)
    parseMSGFormat(content) {
        // This is a simplified parser - in production, you'd use a proper MSG parser library
        const email = {
            headers: {},
            body: content,
            attachments: [],
            metadata: {}
        };

        // Extract basic information from MSG content
        const subjectMatch = content.match(/Subject:\s*(.+)/i);
        const fromMatch = content.match(/From:\s*(.+)/i);
        const toMatch = content.match(/To:\s*(.+)/i);
        const dateMatch = content.match(/Date:\s*(.+)/i);

        if (subjectMatch) email.headers.subject = subjectMatch[1].trim();
        if (fromMatch) email.headers.from = fromMatch[1].trim();
        if (toMatch) email.headers.to = toMatch[1].trim();
        if (dateMatch) email.headers.date = dateMatch[1].trim();

        return this.enrichEmailData(email);
    }

    // Parse plain text format
    parsePlainTextFormat(content) {
        const email = {
            headers: {},
            body: content,
            attachments: [],
            metadata: {}
        };

        // Try to extract headers from plain text
        const lines = content.split('\n');
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i];
            const colonIndex = line.indexOf(':');
            
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).toLowerCase().trim();
                const value = line.substring(colonIndex + 1).trim();
                
                if (['from', 'to', 'subject', 'date', 'cc', 'bcc'].includes(key)) {
                    email.headers[key] = value;
                }
            }
        }

        return this.enrichEmailData(email);
    }

    // Parse MBOX format
    parseMboxFormat(content) {
        const emails = [];
        const emailSections = content.split(/^From /m);

        for (let i = 1; i < emailSections.length; i++) {
            const emailContent = 'From ' + emailSections[i];
            try {
                const parsedEmail = this.parseEMLFormat(emailContent);
                emails.push(parsedEmail);
            } catch (error) {
                ConfigUtils.log('warn', 'Failed to parse email in mbox', { index: i, error: error.message });
            }
        }

        return emails.length === 1 ? emails[0] : emails;
    }

    // Enrich email data with extracted information
    enrichEmailData(email) {
        // Extract metadata
        email.metadata = {
            ...email.metadata,
            ...this.extractMetadata(email),
            ...this.extractSecurityIndicators(email),
            ...this.extractCommunicationPatterns(email)
        };

        // Clean and normalize data
        email.body = this.cleanEmailBody(email.body);
        email.headers = this.normalizeHeaders(email.headers);

        return email;
    }

    // Extract metadata from email
    extractMetadata(email) {
        const metadata = {
            wordCount: 0,
            characterCount: 0,
            lineCount: 0,
            hasAttachments: false,
            attachmentCount: 0,
            emailAddresses: [],
            urls: [],
            ipAddresses: [],
            domains: []
        };

        if (email.body) {
            metadata.wordCount = email.body.split(/\s+/).filter(word => word.length > 0).length;
            metadata.characterCount = email.body.length;
            metadata.lineCount = email.body.split('\n').length;

            // Extract email addresses
            const emailMatches = email.body.match(this.emailRegex) || [];
            metadata.emailAddresses = [...new Set(emailMatches)];

            // Extract URLs
            const urlMatches = email.body.match(this.urlRegex) || [];
            metadata.urls = [...new Set(urlMatches)];

            // Extract IP addresses
            const ipMatches = email.body.match(this.ipRegex) || [];
            metadata.ipAddresses = [...new Set(ipMatches)];

            // Extract domains from URLs and emails
            const domains = new Set();
            [...metadata.urls, ...metadata.emailAddresses].forEach(item => {
                try {
                    let domain;
                    if (item.includes('@')) {
                        domain = item.split('@')[1];
                    } else {
                        const url = new URL(item);
                        domain = url.hostname;
                    }
                    if (domain) domains.add(domain.toLowerCase());
                } catch (e) {
                    // Invalid URL or email, skip
                }
            });
            metadata.domains = Array.from(domains);
        }

        // Check for attachments
        if (email.attachments && email.attachments.length > 0) {
            metadata.hasAttachments = true;
            metadata.attachmentCount = email.attachments.length;
        }

        return metadata;
    }

    // Extract security indicators
    extractSecurityIndicators(email) {
        const indicators = {
            suspiciousKeywords: [],
            phishingIndicators: [],
            malwareIndicators: [],
            spoofingIndicators: [],
            riskScore: 0
        };

        const content = (email.body + ' ' + Object.values(email.headers).join(' ')).toLowerCase();

        // Check for phishing keywords
        CONFIG.THREATS.PHISHING_KEYWORDS.forEach(keyword => {
            if (content.includes(keyword.toLowerCase())) {
                indicators.phishingIndicators.push(keyword);
                indicators.riskScore += 10;
            }
        });

        // Check for suspicious domains
        if (email.metadata && email.metadata.domains) {
            email.metadata.domains.forEach(domain => {
                if (CONFIG.THREATS.SUSPICIOUS_DOMAINS.includes(domain)) {
                    indicators.suspiciousKeywords.push(domain);
                    indicators.riskScore += 15;
                }
            });
        }

        // Check for malware file extensions in attachments
        if (email.attachments) {
            email.attachments.forEach(attachment => {
                const extension = this.getFileExtension(attachment.filename || '');
                if (CONFIG.THREATS.MALWARE_EXTENSIONS.includes(extension)) {
                    indicators.malwareIndicators.push(extension);
                    indicators.riskScore += 25;
                }
            });
        }

        // Check for spoofing indicators
        if (email.headers.from && email.headers['reply-to']) {
            const fromDomain = this.extractDomainFromEmail(email.headers.from);
            const replyToDomain = this.extractDomainFromEmail(email.headers['reply-to']);
            
            if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
                indicators.spoofingIndicators.push('reply-to-mismatch');
                indicators.riskScore += 20;
            }
        }

        // Normalize risk score (0-100)
        indicators.riskScore = Math.min(100, indicators.riskScore);

        return indicators;
    }

    // Extract communication patterns
    extractCommunicationPatterns(email) {
        const patterns = {
            timeSlot: null,
            dayOfWeek: null,
            isReply: false,
            isForward: false,
            threadDepth: 0
        };

        // Analyze timestamp
        if (email.headers.date) {
            try {
                const date = new Date(email.headers.date);
                const hour = date.getHours();
                
                if (hour >= 6 && hour < 12) patterns.timeSlot = 'morning';
                else if (hour >= 12 && hour < 18) patterns.timeSlot = 'afternoon';
                else if (hour >= 18 && hour < 22) patterns.timeSlot = 'evening';
                else patterns.timeSlot = 'night';
                
                patterns.dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            } catch (e) {
                ConfigUtils.log('warn', 'Failed to parse email date', { date: email.headers.date });
            }
        }

        // Check if it's a reply or forward
        const subject = (email.headers.subject || '').toLowerCase();
        patterns.isReply = subject.startsWith('re:');
        patterns.isForward = subject.startsWith('fwd:') || subject.startsWith('fw:');

        // Estimate thread depth based on subject prefixes
        const replyMatches = subject.match(/re:/g);
        const forwardMatches = subject.match(/fw:|fwd:/g);
        patterns.threadDepth = (replyMatches ? replyMatches.length : 0) + 
                              (forwardMatches ? forwardMatches.length : 0);

        return patterns;
    }

    // Clean email body
    cleanEmailBody(body) {
        if (!body) return '';

        // Remove quoted text (lines starting with >)
        const lines = body.split('\n');
        const cleanLines = lines.filter(line => !line.trim().startsWith('>'));
        
        // Remove excessive whitespace
        return cleanLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    // Normalize headers
    normalizeHeaders(headers) {
        const normalized = {};
        
        Object.keys(headers).forEach(key => {
            const normalizedKey = key.toLowerCase().trim();
            normalized[normalizedKey] = headers[key];
        });

        return normalized;
    }

    // Extract domain from email address
    extractDomainFromEmail(email) {
        if (!email) return null;
        
        const match = email.match(/@([^>\s]+)/);
        return match ? match[1].toLowerCase() : null;
    }

    // Validate email structure
    validateEmail(email) {
        const errors = [];

        if (!email.headers) {
            errors.push('Missing headers');
        } else {
            if (!email.headers.from) errors.push('Missing From header');
            if (!email.headers.subject) errors.push('Missing Subject header');
        }

        if (!email.body && (!email.attachments || email.attachments.length === 0)) {
            errors.push('Email has no body content or attachments');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Get email summary
    getEmailSummary(email) {
        return {
            from: email.headers.from || 'Unknown',
            to: email.headers.to || 'Unknown',
            subject: email.headers.subject || 'No Subject',
            date: email.headers.date || 'Unknown Date',
            bodyPreview: email.body ? email.body.substring(0, 200) + '...' : 'No content',
            riskScore: email.metadata?.riskScore || 0,
            hasAttachments: email.metadata?.hasAttachments || false,
            wordCount: email.metadata?.wordCount || 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailParser;
}
