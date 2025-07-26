#!/usr/bin/env node

// Email Intel Hub - Comprehensive Local Test Suite
// This script tests all functionality of the Email Intel Hub

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

class EmailIntelHubTester {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
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
        cyan: '\x1b[36m'
    };

    log(message, color = 'reset') {
        console.log(`${this.colors[color]}${message}${this.colors.reset}`);
    }

    async runTest(testName, testFunction) {
        this.totalTests++;
        try {
            this.log(`\n🧪 Running: ${testName}`, 'cyan');
            const result = await testFunction();
            this.passedTests++;
            this.log(`✅ PASSED: ${testName}`, 'green');
            this.testResults.push({ name: testName, status: 'PASSED', result });
            return result;
        } catch (error) {
            this.failedTests++;
            this.log(`❌ FAILED: ${testName}`, 'red');
            this.log(`   Error: ${error.message}`, 'red');
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
            return null;
        }
    }

    async testServerHealth() {
        const response = await axios.get(`${this.baseURL}/api/health`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        if (!response.data.status || response.data.status !== 'healthy') {
            throw new Error('Server health check failed');
        }
        return response.data;
    }

    async testDashboardAccess() {
        const response = await axios.get(this.baseURL);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        if (!response.data.includes('Email Intel Hub')) {
            throw new Error('Dashboard HTML does not contain expected title');
        }
        return { status: 'Dashboard accessible', size: response.data.length };
    }

    async testInitialStats() {
        const response = await axios.get(`${this.baseURL}/api/stats`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        const stats = response.data;
        if (typeof stats.totalEmails !== 'number') {
            throw new Error('Stats should contain totalEmails number');
        }
        return stats;
    }

    async testEmailUpload(filename) {
        if (!fs.existsSync(filename)) {
            throw new Error(`Test file ${filename} does not exist`);
        }

        const form = new FormData();
        form.append('emails', fs.createReadStream(filename));

        const response = await axios.post(`${this.baseURL}/api/upload`, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const result = response.data;
        if (!result.success) {
            throw new Error(`Upload failed: ${result.error || 'Unknown error'}`);
        }

        if (!result.results || result.results.length === 0) {
            throw new Error('No analysis results returned');
        }

        return result;
    }

    async testBatchUpload() {
        const files = ['sample-email.eml', 'sample-legitimate-email.eml', 'sample-spam-email.eml'];
        const existingFiles = files.filter(file => fs.existsSync(file));
        
        if (existingFiles.length === 0) {
            throw new Error('No test email files found');
        }

        const form = new FormData();
        existingFiles.forEach(file => {
            form.append('emails', fs.createReadStream(file));
        });

        const response = await axios.post(`${this.baseURL}/api/upload`, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const result = response.data;
        if (!result.success) {
            throw new Error(`Batch upload failed: ${result.error || 'Unknown error'}`);
        }

        if (result.results.length !== existingFiles.length) {
            throw new Error(`Expected ${existingFiles.length} results, got ${result.results.length}`);
        }

        return { filesUploaded: existingFiles.length, results: result.results };
    }

    async testAnalysisResults() {
        const response = await axios.get(`${this.baseURL}/api/analysis`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const data = response.data;
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('Analysis results should be an array');
        }

        // Verify analysis structure
        if (data.results.length > 0) {
            const firstResult = data.results[0];
            const requiredFields = ['id', 'filename', 'riskScore', 'threats', 'sentiment', 'topics', 'timestamp'];
            
            for (const field of requiredFields) {
                if (!(field in firstResult)) {
                    throw new Error(`Analysis result missing required field: ${field}`);
                }
            }

            if (typeof firstResult.riskScore !== 'number' || firstResult.riskScore < 0 || firstResult.riskScore > 100) {
                throw new Error('Risk score should be a number between 0 and 100');
            }
        }

        return { totalResults: data.results.length, sampleResult: data.results[0] };
    }

    async testIntelligenceData() {
        const response = await axios.get(`${this.baseURL}/api/intelligence`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const data = response.data;
        const requiredFields = ['topTopics', 'sentimentTrend', 'communicationPatterns', 'riskAssessment'];
        
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Intelligence data missing required field: ${field}`);
            }
        }

        return data;
    }

    async testStatsAfterUpload() {
        const response = await axios.get(`${this.baseURL}/api/stats`);
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const stats = response.data;
        if (stats.totalEmails === 0) {
            throw new Error('Stats should show emails after upload');
        }

        return stats;
    }

    async testTimeRangeFiltering() {
        const timeRanges = ['24h', '7d', '30d', '90d'];
        const results = {};

        for (const range of timeRanges) {
            const response = await axios.get(`${this.baseURL}/api/stats?timeRange=${range}`);
            if (response.status !== 200) {
                throw new Error(`Failed to get stats for time range ${range}`);
            }
            results[range] = response.data;
        }

        return results;
    }

    async testErrorHandling() {
        // Test invalid endpoint
        try {
            await axios.get(`${this.baseURL}/api/nonexistent`);
            throw new Error('Should have returned 404 for invalid endpoint');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                // Expected behavior
            } else {
                throw error;
            }
        }

        // Test invalid file upload
        try {
            const form = new FormData();
            form.append('emails', Buffer.from('invalid content'), 'test.txt');
            
            await axios.post(`${this.baseURL}/api/upload`, form, {
                headers: { ...form.getHeaders() },
            });
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                // Expected behavior for invalid file
            } else {
                throw error;
            }
        }

        return { message: 'Error handling working correctly' };
    }

    async createTestReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: `${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`
            },
            results: this.testResults
        };

        const reportPath = 'test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        return { reportPath, report };
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'bright');
        this.log('📊 EMAIL INTEL HUB - TEST SUMMARY', 'bright');
        this.log('='.repeat(60), 'bright');
        
        this.log(`\n📈 Total Tests: ${this.totalTests}`, 'blue');
        this.log(`✅ Passed: ${this.passedTests}`, 'green');
        this.log(`❌ Failed: ${this.failedTests}`, 'red');
        this.log(`📊 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`, 'cyan');

        if (this.failedTests > 0) {
            this.log('\n❌ Failed Tests:', 'red');
            this.testResults
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    this.log(`   • ${test.name}: ${test.error}`, 'red');
                });
        }

        this.log('\n' + '='.repeat(60), 'bright');
        
        if (this.failedTests === 0) {
            this.log('🎉 ALL TESTS PASSED! Email Intel Hub is working perfectly!', 'green');
        } else {
            this.log('⚠️  Some tests failed. Please check the issues above.', 'yellow');
        }
    }

    async runAllTests() {
        this.log('🚀 Starting Email Intel Hub Comprehensive Test Suite', 'bright');
        this.log('=' * 60, 'bright');

        // Basic connectivity tests
        await this.runTest('Server Health Check', () => this.testServerHealth());
        await this.runTest('Dashboard Access', () => this.testDashboardAccess());
        await this.runTest('Initial Statistics', () => this.testInitialStats());

        // Email processing tests
        if (fs.existsSync('sample-email.eml')) {
            await this.runTest('Single Email Upload', () => this.testEmailUpload('sample-email.eml'));
        }
        
        await this.runTest('Batch Email Upload', () => this.testBatchUpload());
        await this.runTest('Analysis Results Retrieval', () => this.testAnalysisResults());
        await this.runTest('Intelligence Data', () => this.testIntelligenceData());
        await this.runTest('Updated Statistics', () => this.testStatsAfterUpload());

        // Advanced functionality tests
        await this.runTest('Time Range Filtering', () => this.testTimeRangeFiltering());
        await this.runTest('Error Handling', () => this.testErrorHandling());

        // Generate report
        await this.runTest('Test Report Generation', () => this.createTestReport());

        this.printSummary();
    }
}

// Main execution
async function main() {
    const tester = new EmailIntelHubTester();
    
    // Check if server is running
    try {
        await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
    } catch (error) {
        console.log('❌ Server is not running on http://localhost:3000');
        console.log('Please start the server with: npm start');
        process.exit(1);
    }

    await tester.runAllTests();
}

// Run the tests
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = EmailIntelHubTester;
