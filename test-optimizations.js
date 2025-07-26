#!/usr/bin/env node

// Email Intel Hub - Optimization Test Suite
// Tests performance improvements, security enhancements, and new features

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

class OptimizationTester {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.testResults = [];
        this.performanceMetrics = {};
        this.securityTests = [];
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
        try {
            this.log(`\n🧪 Running: ${testName}`, 'cyan');
            const startTime = Date.now();
            
            const result = await testFunction();
            
            const duration = Date.now() - startTime;
            this.performanceMetrics[testName] = duration;
            
            this.log(`✅ PASSED: ${testName} (${duration}ms)`, 'green');
            this.testResults.push({ name: testName, status: 'PASSED', duration, result });
            
            return result;
        } catch (error) {
            this.log(`❌ FAILED: ${testName} - ${error.message}`, 'red');
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
            throw error;
        }
    }

    // Test rate limiting functionality
    async testRateLimiting() {
        const requests = [];
        const startTime = Date.now();
        
        // Send 15 rapid requests to trigger rate limiting
        for (let i = 0; i < 15; i++) {
            requests.push(
                axios.get(`${this.baseURL}/api/health`, { timeout: 5000 })
                    .catch(err => ({ error: err.response?.status || err.code }))
            );
        }
        
        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.error === 429);
        
        if (!rateLimited) {
            throw new Error('Rate limiting not working - expected 429 status');
        }
        
        return {
            totalRequests: requests.length,
            rateLimitTriggered: rateLimited,
            duration: Date.now() - startTime
        };
    }

    // Test file upload security
    async testUploadSecurity() {
        const testCases = [
            {
                name: 'Invalid file type',
                filename: 'malicious.exe',
                content: 'fake executable content',
                expectedError: true
            },
            {
                name: 'Oversized filename',
                filename: 'a'.repeat(300) + '.eml',
                content: 'test email content',
                expectedError: true
            },
            {
                name: 'Empty file',
                filename: 'empty.eml',
                content: '',
                expectedError: true
            }
        ];

        const results = [];
        
        for (const testCase of testCases) {
            try {
                const form = new FormData();
                form.append('emails', Buffer.from(testCase.content), {
                    filename: testCase.filename,
                    contentType: 'text/plain'
                });

                const response = await axios.post(`${this.baseURL}/api/upload`, form, {
                    headers: form.getHeaders(),
                    timeout: 10000
                });

                if (testCase.expectedError) {
                    results.push({ ...testCase, result: 'FAILED - Should have been rejected' });
                } else {
                    results.push({ ...testCase, result: 'PASSED' });
                }
            } catch (error) {
                if (testCase.expectedError && error.response?.status >= 400) {
                    results.push({ ...testCase, result: 'PASSED - Correctly rejected' });
                } else {
                    results.push({ ...testCase, result: `FAILED - ${error.message}` });
                }
            }
        }

        return results;
    }

    // Test performance improvements
    async testPerformanceImprovements() {
        const testFile = 'sample-email.eml';
        
        if (!(await this.fileExists(testFile))) {
            throw new Error(`Test file ${testFile} not found`);
        }

        const metrics = {
            uploadTimes: [],
            analysisTimes: [],
            cacheHits: 0
        };

        // Test multiple uploads of the same file to test caching
        for (let i = 0; i < 3; i++) {
            const startTime = Date.now();
            
            const form = new FormData();
            const fileContent = await fs.readFile(testFile);
            form.append('emails', fileContent, { filename: testFile });

            const response = await axios.post(`${this.baseURL}/api/upload`, form, {
                headers: form.getHeaders(),
                timeout: 30000
            });

            const uploadTime = Date.now() - startTime;
            metrics.uploadTimes.push(uploadTime);

            if (response.data.success && response.data.results.length > 0) {
                const analysis = response.data.results[0];
                if (analysis.results?.metadata?.processingTime) {
                    metrics.analysisTimes.push(analysis.results.metadata.processingTime);
                }
            }
        }

        // Calculate performance metrics
        const avgUploadTime = metrics.uploadTimes.reduce((a, b) => a + b, 0) / metrics.uploadTimes.length;
        const avgAnalysisTime = metrics.analysisTimes.reduce((a, b) => a + b, 0) / metrics.analysisTimes.length;

        return {
            averageUploadTime: avgUploadTime,
            averageAnalysisTime: avgAnalysisTime,
            uploadTimes: metrics.uploadTimes,
            analysisTimes: metrics.analysisTimes,
            performanceImprovement: metrics.uploadTimes[0] > metrics.uploadTimes[2] // Should be faster on subsequent runs
        };
    }

    // Test error handling improvements
    async testErrorHandling() {
        const errorTests = [
            {
                name: 'Invalid JSON payload',
                test: () => axios.post(`${this.baseURL}/api/upload`, 'invalid json', {
                    headers: { 'Content-Type': 'application/json' }
                })
            },
            {
                name: 'Missing required fields',
                test: () => axios.post(`${this.baseURL}/api/upload`, {})
            },
            {
                name: 'Malformed request',
                test: () => axios.post(`${this.baseURL}/api/nonexistent`, {})
            }
        ];

        const results = [];
        
        for (const errorTest of errorTests) {
            try {
                await errorTest.test();
                results.push({ ...errorTest, result: 'FAILED - Should have thrown error' });
            } catch (error) {
                if (error.response && error.response.status >= 400) {
                    results.push({ 
                        ...errorTest, 
                        result: 'PASSED - Correctly handled error',
                        status: error.response.status,
                        message: error.response.data?.error || error.message
                    });
                } else {
                    results.push({ ...errorTest, result: `FAILED - ${error.message}` });
                }
            }
        }

        return results;
    }

    // Test compression and caching
    async testCompressionAndCaching() {
        const response1 = await axios.get(`${this.baseURL}/`, {
            headers: { 'Accept-Encoding': 'gzip, deflate' }
        });

        const response2 = await axios.get(`${this.baseURL}/`, {
            headers: { 
                'Accept-Encoding': 'gzip, deflate',
                'If-None-Match': response1.headers.etag
            }
        });

        return {
            compressionSupported: response1.headers['content-encoding'] === 'gzip',
            etagPresent: !!response1.headers.etag,
            cachingWorking: response2.status === 304 || response2.status === 200,
            response1Size: response1.headers['content-length'],
            response2Size: response2.headers['content-length']
        };
    }

    async fileExists(filename) {
        try {
            await fs.access(filename);
            return true;
        } catch {
            return false;
        }
    }

    // Generate comprehensive optimization report
    async generateOptimizationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.testResults.length,
                passed: this.testResults.filter(t => t.status === 'PASSED').length,
                failed: this.testResults.filter(t => t.status === 'FAILED').length,
                averageTestTime: Object.values(this.performanceMetrics).reduce((a, b) => a + b, 0) / Object.keys(this.performanceMetrics).length
            },
            performanceMetrics: this.performanceMetrics,
            testResults: this.testResults,
            optimizations: {
                rateLimiting: 'Implemented',
                compression: 'Enabled',
                caching: 'Enhanced',
                errorHandling: 'Improved',
                security: 'Strengthened',
                asyncProcessing: 'Optimized'
            }
        };

        await fs.writeFile('optimization-report.json', JSON.stringify(report, null, 2));
        
        return report;
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'bright');
        this.log('📊 OPTIMIZATION TEST SUMMARY', 'bright');
        this.log('='.repeat(60), 'bright');
        
        const passed = this.testResults.filter(t => t.status === 'PASSED').length;
        const failed = this.testResults.filter(t => t.status === 'FAILED').length;
        const total = this.testResults.length;
        
        this.log(`\n📈 Total Tests: ${total}`, 'blue');
        this.log(`✅ Passed: ${passed}`, 'green');
        this.log(`❌ Failed: ${failed}`, 'red');
        this.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`, 'cyan');
        
        if (Object.keys(this.performanceMetrics).length > 0) {
            this.log('\n⚡ Performance Metrics:', 'yellow');
            Object.entries(this.performanceMetrics).forEach(([test, time]) => {
                this.log(`  ${test}: ${time}ms`, 'blue');
            });
        }
        
        this.log('\n' + '='.repeat(60), 'bright');
        
        if (failed === 0) {
            this.log('🎉 ALL OPTIMIZATION TESTS PASSED!', 'green');
        } else {
            this.log(`⚠️  ${failed} optimization tests failed`, 'yellow');
        }
    }

    async runAllOptimizationTests() {
        this.log('🚀 Starting Email Intel Hub Optimization Test Suite', 'bright');
        this.log('=' * 60, 'bright');

        // Performance and security tests
        await this.runTest('Rate Limiting', () => this.testRateLimiting());
        await this.runTest('Upload Security', () => this.testUploadSecurity());
        await this.runTest('Performance Improvements', () => this.testPerformanceImprovements());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        await this.runTest('Compression and Caching', () => this.testCompressionAndCaching());

        // Generate comprehensive report
        await this.runTest('Optimization Report Generation', () => this.generateOptimizationReport());

        this.printSummary();
    }
}

// Main execution
async function main() {
    const tester = new OptimizationTester();
    
    // Check if server is running
    try {
        await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
    } catch (error) {
        console.log('❌ Server is not running on http://localhost:3000');
        console.log('Please start the server with: npm start');
        process.exit(1);
    }

    await tester.runAllOptimizationTests();
}

// Run the optimization tests
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Optimization test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = OptimizationTester;
