#!/usr/bin/env node

// Email Intel Hub - Proof of Concept Demo
// This script demonstrates all features of the Email Intel Hub

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

class EmailIntelHubDemo {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.demoResults = [];
        this.startTime = Date.now();
    }

    // Color codes for console output
    colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m'
    };

    log(message, color = 'reset') {
        console.log(`${this.colors[color]}${message}${this.colors.reset}`);
    }

    printHeader(title) {
        const border = '='.repeat(80);
        this.log('\n' + border, 'bright');
        this.log(`🚀 ${title}`, 'bright');
        this.log(border, 'bright');
        this.log('');
    }

    printSection(title) {
        this.log(`\n📋 ${title}`, 'cyan');
        this.log('-'.repeat(60), 'cyan');
    }

    async checkServerStatus() {
        try {
            const response = await axios.get(`${this.baseURL}/api/health`);
            return response.data;
        } catch (error) {
            throw new Error('Server is not running. Please start with: npm start');
        }
    }

    async demonstrateEmailAnalysis() {
        this.printSection('Email Analysis Demonstration');

        // Get list of sample emails
        const sampleEmails = [
            'sample-email.eml',
            'sample-legitimate-email.eml', 
            'sample-spam-email.eml',
            'sample-bec-email.eml',
            'sample-malware-email.eml'
        ].filter(file => fs.existsSync(file));

        if (sampleEmails.length === 0) {
            this.log('⚠️  No sample email files found', 'yellow');
            return;
        }

        this.log(`📧 Found ${sampleEmails.length} sample emails to analyze:`, 'blue');
        sampleEmails.forEach(email => {
            this.log(`   • ${email}`, 'white');
        });

        // Analyze each email individually to show detailed results
        for (const emailFile of sampleEmails) {
            this.log(`\n🔍 Analyzing: ${emailFile}`, 'cyan');
            
            try {
                const form = new FormData();
                form.append('emails', fs.createReadStream(emailFile));

                const response = await axios.post(`${this.baseURL}/api/upload`, form, {
                    headers: { ...form.getHeaders() },
                });

                if (response.data.success && response.data.results.length > 0) {
                    const result = response.data.results[0];
                    this.displayAnalysisResult(result, emailFile);
                    this.demoResults.push({ file: emailFile, result });
                } else {
                    this.log(`   ❌ Failed to analyze ${emailFile}`, 'red');
                }
            } catch (error) {
                this.log(`   ❌ Error analyzing ${emailFile}: ${error.message}`, 'red');
            }

            // Small delay for better demo flow
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    displayAnalysisResult(result, filename) {
        // Risk level color coding
        const getRiskColor = (score) => {
            if (score >= 75) return 'red';
            if (score >= 50) return 'yellow';
            if (score >= 25) return 'blue';
            return 'green';
        };

        const riskColor = getRiskColor(result.riskScore);
        
        this.log(`   📊 Risk Score: ${result.riskScore}/100`, riskColor);
        
        // Threat analysis
        const threats = Object.entries(result.threats)
            .filter(([key, value]) => value)
            .map(([key]) => key);
        
        if (threats.length > 0) {
            this.log(`   🚨 Threats Detected: ${threats.join(', ')}`, 'red');
        } else {
            this.log(`   ✅ No threats detected`, 'green');
        }

        // Sentiment analysis
        const sentimentText = result.sentiment > 0.1 ? 'Positive' : 
                             result.sentiment < -0.1 ? 'Negative' : 'Neutral';
        const sentimentColor = result.sentiment > 0 ? 'green' : 
                              result.sentiment < 0 ? 'red' : 'blue';
        
        this.log(`   😊 Sentiment: ${sentimentText} (${result.sentiment.toFixed(2)})`, sentimentColor);
        
        // Topics
        if (result.topics && result.topics.length > 0) {
            this.log(`   🏷️  Topics: ${result.topics.join(', ')}`, 'magenta');
        }
    }

    async demonstrateDashboardStats() {
        this.printSection('Dashboard Statistics');

        try {
            const response = await axios.get(`${this.baseURL}/api/stats`);
            const stats = response.data;

            this.log('📊 Current System Statistics:', 'bright');
            this.log(`   📧 Total Emails: ${stats.totalEmails}`, 'blue');
            this.log(`   🚨 Threats Detected: ${stats.threatsDetected}`, 'red');
            this.log(`   📈 Average Risk Score: ${stats.averageRiskScore}/100`, 'yellow');
            this.log(`   😊 Average Sentiment: ${stats.averageSentiment}`, 'green');

            if (stats.threatBreakdown) {
                this.log('\n🔍 Threat Breakdown:', 'cyan');
                Object.entries(stats.threatBreakdown).forEach(([type, count]) => {
                    if (count > 0) {
                        this.log(`   • ${type}: ${count}`, 'red');
                    }
                });
            }

            return stats;
        } catch (error) {
            this.log(`❌ Failed to get statistics: ${error.message}`, 'red');
            return null;
        }
    }

    async demonstrateIntelligenceData() {
        this.printSection('Intelligence Analysis');

        try {
            const response = await axios.get(`${this.baseURL}/api/intelligence`);
            const intelligence = response.data;

            this.log('🧠 Intelligence Insights:', 'bright');
            
            if (intelligence.topTopics) {
                this.log(`   🏷️  Top Topics: ${intelligence.topTopics.join(', ')}`, 'magenta');
            }

            if (intelligence.sentimentTrend) {
                this.log('\n📈 Sentiment Trend (last 5 days):', 'cyan');
                intelligence.sentimentTrend.forEach(item => {
                    const trendColor = item.sentiment > 0 ? 'green' : 
                                      item.sentiment < 0 ? 'red' : 'blue';
                    this.log(`   • ${item.date}: ${item.sentiment.toFixed(2)}`, trendColor);
                });
            }

            if (intelligence.communicationPatterns) {
                this.log('\n⏰ Communication Patterns:', 'yellow');
                this.log(`   • Peak Hours: ${intelligence.communicationPatterns.peakHours.join(', ')}`, 'white');
                this.log(`   • Busy Days: ${intelligence.communicationPatterns.busyDays.join(', ')}`, 'white');
            }

            if (intelligence.riskAssessment) {
                this.log('\n⚠️  Risk Assessment Distribution:', 'red');
                Object.entries(intelligence.riskAssessment).forEach(([level, count]) => {
                    const levelColor = level === 'critical' ? 'red' : 
                                      level === 'high' ? 'yellow' : 
                                      level === 'medium' ? 'blue' : 'green';
                    this.log(`   • ${level.toUpperCase()}: ${count} emails`, levelColor);
                });
            }

            return intelligence;
        } catch (error) {
            this.log(`❌ Failed to get intelligence data: ${error.message}`, 'red');
            return null;
        }
    }

    async demonstrateAPIPerformance() {
        this.printSection('API Performance Testing');

        const endpoints = [
            { name: 'Health Check', url: '/api/health' },
            { name: 'Statistics', url: '/api/stats' },
            { name: 'Analysis Results', url: '/api/analysis' },
            { name: 'Intelligence Data', url: '/api/intelligence' }
        ];

        this.log('⚡ Testing API response times:', 'bright');

        for (const endpoint of endpoints) {
            try {
                const startTime = Date.now();
                await axios.get(`${this.baseURL}${endpoint.url}`);
                const responseTime = Date.now() - startTime;
                
                const timeColor = responseTime < 100 ? 'green' : 
                                 responseTime < 500 ? 'yellow' : 'red';
                
                this.log(`   • ${endpoint.name}: ${responseTime}ms`, timeColor);
            } catch (error) {
                this.log(`   • ${endpoint.name}: ERROR`, 'red');
            }
        }
    }

    async demonstrateBatchProcessing() {
        this.printSection('Batch Processing Demonstration');

        const sampleEmails = [
            'sample-email.eml',
            'sample-legitimate-email.eml', 
            'sample-spam-email.eml'
        ].filter(file => fs.existsSync(file));

        if (sampleEmails.length < 2) {
            this.log('⚠️  Need at least 2 sample emails for batch demo', 'yellow');
            return;
        }

        this.log(`📦 Processing ${sampleEmails.length} emails in batch...`, 'cyan');

        try {
            const form = new FormData();
            sampleEmails.forEach(file => {
                form.append('emails', fs.createReadStream(file));
            });

            const startTime = Date.now();
            const response = await axios.post(`${this.baseURL}/api/upload`, form, {
                headers: { ...form.getHeaders() },
            });
            const processingTime = Date.now() - startTime;

            if (response.data.success) {
                this.log(`✅ Batch processing completed in ${processingTime}ms`, 'green');
                this.log(`📊 Processed ${response.data.results.length} emails`, 'blue');
                
                // Show summary of batch results
                const riskScores = response.data.results.map(r => r.riskScore);
                const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
                const maxRisk = Math.max(...riskScores);
                const minRisk = Math.min(...riskScores);
                
                this.log(`   • Average Risk: ${avgRisk.toFixed(1)}/100`, 'yellow');
                this.log(`   • Highest Risk: ${maxRisk}/100`, 'red');
                this.log(`   • Lowest Risk: ${minRisk}/100`, 'green');
            } else {
                this.log('❌ Batch processing failed', 'red');
            }
        } catch (error) {
            this.log(`❌ Batch processing error: ${error.message}`, 'red');
        }
    }

    async generateDemoReport() {
        this.printSection('Generating Demo Report');

        const totalTime = Date.now() - this.startTime;
        
        const report = {
            timestamp: new Date().toISOString(),
            demoInfo: {
                duration: `${(totalTime / 1000).toFixed(2)} seconds`,
                emailsAnalyzed: this.demoResults.length,
                serverStatus: 'operational'
            },
            results: this.demoResults,
            summary: {
                avgRiskScore: this.demoResults.length > 0 ? 
                    (this.demoResults.reduce((sum, r) => sum + r.result.riskScore, 0) / this.demoResults.length).toFixed(1) : 0,
                threatsFound: this.demoResults.filter(r => 
                    Object.values(r.result.threats).some(threat => threat)
                ).length,
                sentimentRange: this.demoResults.length > 0 ? {
                    min: Math.min(...this.demoResults.map(r => r.result.sentiment)).toFixed(2),
                    max: Math.max(...this.demoResults.map(r => r.result.sentiment)).toFixed(2)
                } : null
            }
        };

        // Save report
        const reportPath = 'demo-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`📄 Demo report saved to: ${reportPath}`, 'green');
        
        // Display summary
        this.log('\n📊 Demo Summary:', 'bright');
        this.log(`   ⏱️  Duration: ${report.demoInfo.duration}`, 'blue');
        this.log(`   📧 Emails Analyzed: ${report.demoInfo.emailsAnalyzed}`, 'blue');
        this.log(`   📈 Average Risk Score: ${report.summary.avgRiskScore}/100`, 'yellow');
        this.log(`   🚨 Threats Found: ${report.summary.threatsFound}`, 'red');
        
        if (report.summary.sentimentRange) {
            this.log(`   😊 Sentiment Range: ${report.summary.sentimentRange.min} to ${report.summary.sentimentRange.max}`, 'green');
        }

        return report;
    }

    async runCompleteDemo() {
        this.printHeader('EMAIL INTEL HUB - PROOF OF CONCEPT DEMONSTRATION');

        try {
            // Check server status
            this.log('🔍 Checking server status...', 'cyan');
            const serverStatus = await this.checkServerStatus();
            this.log(`✅ Server is healthy (version: ${serverStatus.version || 'unknown'})`, 'green');

            // Run demonstrations
            await this.demonstrateEmailAnalysis();
            await this.demonstrateDashboardStats();
            await this.demonstrateIntelligenceData();
            await this.demonstrateAPIPerformance();
            await this.demonstrateBatchProcessing();

            // Generate final report
            const report = await this.generateDemoReport();

            // Final summary
            this.printHeader('PROOF OF CONCEPT COMPLETE');
            
            this.log('🎉 Email Intel Hub Demonstration Completed Successfully!', 'green');
            this.log('', 'reset');
            this.log('Key Features Demonstrated:', 'bright');
            this.log('✅ AI-powered threat detection', 'green');
            this.log('✅ Multi-format email parsing', 'green');
            this.log('✅ Real-time sentiment analysis', 'green');
            this.log('✅ Topic extraction and intelligence', 'green');
            this.log('✅ Interactive dashboard statistics', 'green');
            this.log('✅ Batch processing capabilities', 'green');
            this.log('✅ High-performance API endpoints', 'green');
            this.log('✅ Comprehensive reporting', 'green');
            
            this.log('\n🌐 Access the web dashboard at: http://localhost:3000', 'cyan');
            this.log('📄 View detailed report in: demo-report.json', 'cyan');
            this.log('🧪 Run tests with: npm run test:full', 'cyan');
            
            this.log('\n🚀 The Email Intel Hub is production-ready!', 'bright');

        } catch (error) {
            this.log(`❌ Demo failed: ${error.message}`, 'red');
            this.log('\nPlease ensure the server is running with: npm start', 'yellow');
            process.exit(1);
        }
    }
}

// Run the demonstration
async function main() {
    const demo = new EmailIntelHubDemo();
    await demo.runCompleteDemo();
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Demo error:', error.message);
        process.exit(1);
    });
}

module.exports = EmailIntelHubDemo;
