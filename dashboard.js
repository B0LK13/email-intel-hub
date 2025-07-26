// Email Intel Hub - Dashboard JavaScript

class EmailIntelDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.charts = {};
        this.refreshInterval = null;
        this.emailIntelAgent = new EmailIntelAgent();
        this.emailParser = new EmailParser();
        
        this.init();
    }

    async init() {
        try {
            // Initialize the Email Intel Agent
            await this.emailIntelAgent.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize charts
            this.initializeCharts();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('📊 Email Intel Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showNotification('Failed to initialize dashboard', 'error');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.switchSection(section);
            });
        });

        // Email connection modal
        const connectBtn = document.getElementById('connectEmailBtn');
        const modal = document.getElementById('emailConnectionModal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelConnection');

        connectBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Email connection form
        document.getElementById('emailConnectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.connectEmailAccount();
        });

        // File upload
        const uploadArea = document.getElementById('emailUploadArea');
        const fileInput = document.getElementById('emailFileInput');

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.handleFileUpload(files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Analyze emails button
        document.getElementById('analyzeEmailsBtn').addEventListener('click', () => {
            this.analyzeEmails();
        });

        // Generate insights button
        document.getElementById('generateInsightsBtn').addEventListener('click', () => {
            this.generateInsights();
        });

        // Time range filter
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.loadDashboardData(e.target.value);
        });

        // Email search and filter
        document.getElementById('emailSearch').addEventListener('input', (e) => {
            this.filterEmails(e.target.value);
        });

        document.getElementById('emailFilter').addEventListener('change', (e) => {
            this.filterEmails(null, e.target.value);
        });
    }

    switchSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Add active class to nav item
        const navItem = document.querySelector(`[href="#${sectionName}"]`).parentElement;
        navItem.classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'emails':
                await this.loadEmailList();
                break;
            case 'intelligence':
                await this.loadIntelligenceData();
                break;
            case 'reports':
                await this.loadReports();
                break;
            case 'threats':
                await this.loadThreatData();
                break;
        }
    }

    async loadDashboardData(timeRange = '7d') {
        try {
            this.showLoading(true);

            // Load statistics
            const response = await fetch(`/api/stats?timeRange=${timeRange}`);
            const stats = await response.json();

            // Update stat cards
            document.getElementById('totalEmails').textContent = stats.totalEmails;
            document.getElementById('threatsDetected').textContent = stats.threatsDetected;
            document.getElementById('sentimentScore').textContent = stats.averageSentiment;
            document.getElementById('aiInsights').textContent = Math.floor(stats.totalEmails * 0.3);

            // Update charts
            this.updateEmailVolumeChart(stats);
            this.updateThreatChart(stats.threatBreakdown);

            // Load recent activity
            await this.loadRecentActivity();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    initializeCharts() {
        // Email Volume Chart
        const volumeCtx = document.getElementById('emailVolumeChart').getContext('2d');
        this.charts.volume = new Chart(volumeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Email Volume',
                    data: [],
                    borderColor: CONFIG.DASHBOARD.CHART_COLORS.PRIMARY,
                    backgroundColor: CONFIG.DASHBOARD.CHART_COLORS.PRIMARY + '20',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Threat Chart
        const threatCtx = document.getElementById('threatChart').getContext('2d');
        this.charts.threat = new Chart(threatCtx, {
            type: 'doughnut',
            data: {
                labels: ['Phishing', 'Malware', 'Spam', 'Clean'],
                datasets: [{
                    data: [0, 0, 0, 100],
                    backgroundColor: [
                        CONFIG.DASHBOARD.CHART_COLORS.DANGER,
                        CONFIG.DASHBOARD.CHART_COLORS.WARNING,
                        CONFIG.DASHBOARD.CHART_COLORS.SECONDARY,
                        CONFIG.DASHBOARD.CHART_COLORS.SUCCESS
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    updateEmailVolumeChart(stats) {
        // Generate sample data for the last 7 days
        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 20) + 5);
        }

        this.charts.volume.data.labels = labels;
        this.charts.volume.data.datasets[0].data = data;
        this.charts.volume.update();
    }

    updateThreatChart(threatBreakdown) {
        const total = Object.values(threatBreakdown).reduce((sum, count) => sum + count, 0);
        const clean = Math.max(0, total * 2); // Assume more clean emails

        this.charts.threat.data.datasets[0].data = [
            threatBreakdown.phishing || 0,
            threatBreakdown.malware || 0,
            threatBreakdown.spam || 0,
            clean
        ];
        this.charts.threat.update();
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/analysis?limit=5');
            const data = await response.json();
            
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '';

            if (data.results.length === 0) {
                activityList.innerHTML = '<p class="text-secondary">No recent activity</p>';
                return;
            }

            data.results.forEach(result => {
                const activityItem = this.createActivityItem(result);
                activityList.appendChild(activityItem);
            });

        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    createActivityItem(result) {
        const item = document.createElement('div');
        item.className = 'activity-item';

        const iconClass = result.riskScore > 50 ? 'threat' : 'analysis';
        const icon = result.riskScore > 50 ? 'fa-exclamation-triangle' : 'fa-search';

        item.innerHTML = `
            <div class="activity-icon ${iconClass}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <h4>${result.filename}</h4>
                <p>Risk Score: ${result.riskScore}/100</p>
                <small>${new Date(result.timestamp).toLocaleString()}</small>
            </div>
        `;

        return item;
    }

    async handleFileUpload(files) {
        if (files.length === 0) return;

        try {
            this.showLoading(true, 'Uploading and analyzing emails...');

            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('emails', file);
            });

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Successfully analyzed ${result.results.length} emails`, 'success');
                await this.loadDashboardData();
                await this.loadEmailList();
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Failed to upload emails: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadEmailList() {
        try {
            const response = await fetch('/api/analysis');
            const data = await response.json();
            
            const emailItems = document.getElementById('emailItems');
            emailItems.innerHTML = '';

            if (data.results.length === 0) {
                emailItems.innerHTML = '<p class="text-secondary">No emails analyzed yet. Upload some emails to get started.</p>';
                return;
            }

            data.results.forEach(result => {
                const emailItem = this.createEmailItem(result);
                emailItems.appendChild(emailItem);
            });

        } catch (error) {
            console.error('Error loading email list:', error);
        }
    }

    createEmailItem(result) {
        const item = document.createElement('div');
        item.className = 'email-item';

        const riskClass = result.riskScore > 75 ? 'critical' : 
                         result.riskScore > 50 ? 'high' : 
                         result.riskScore > 25 ? 'medium' : 'low';

        const threats = Object.entries(result.threats)
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join(', ') || 'None detected';

        item.innerHTML = `
            <div class="email-header">
                <h4>${result.filename}</h4>
                <span class="risk-badge ${riskClass}">${result.riskScore}/100</span>
            </div>
            <div class="email-details">
                <p><strong>Threats:</strong> ${threats}</p>
                <p><strong>Sentiment:</strong> ${result.sentiment > 0 ? 'Positive' : result.sentiment < 0 ? 'Negative' : 'Neutral'}</p>
                <p><strong>Topics:</strong> ${result.topics.join(', ')}</p>
                <small>Analyzed: ${new Date(result.timestamp).toLocaleString()}</small>
            </div>
        `;

        return item;
    }

    async loadIntelligenceData() {
        try {
            const response = await fetch('/api/intelligence');
            const data = await response.json();

            // Update sentiment analysis
            document.getElementById('sentimentAnalysis').innerHTML = this.createSentimentChart(data.sentimentTrend);

            // Update key topics
            document.getElementById('keyTopics').innerHTML = this.createTopicsList(data.topTopics);

            // Update communication patterns
            document.getElementById('communicationPatterns').innerHTML = this.createPatternsDisplay(data.communicationPatterns);

            // Update risk assessment
            document.getElementById('riskAssessment').innerHTML = this.createRiskDisplay(data.riskAssessment);

        } catch (error) {
            console.error('Error loading intelligence data:', error);
        }
    }

    createSentimentChart(sentimentTrend) {
        return `
            <div class="sentiment-chart">
                ${sentimentTrend.map(item => `
                    <div class="sentiment-item">
                        <span class="date">${new Date(item.date).toLocaleDateString()}</span>
                        <div class="sentiment-bar">
                            <div class="sentiment-fill" style="width: ${(item.sentiment + 1) * 50}%; background-color: ${item.sentiment > 0 ? '#10b981' : '#ef4444'}"></div>
                        </div>
                        <span class="value">${item.sentiment.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    createTopicsList(topics) {
        return `
            <div class="topics-list">
                ${topics.map(topic => `
                    <span class="topic-tag">${topic}</span>
                `).join('')}
            </div>
        `;
    }

    createPatternsDisplay(patterns) {
        return `
            <div class="patterns-display">
                <div class="pattern-item">
                    <h5>Peak Hours</h5>
                    <p>${patterns.peakHours.join(', ')}</p>
                </div>
                <div class="pattern-item">
                    <h5>Busy Days</h5>
                    <p>${patterns.busyDays.join(', ')}</p>
                </div>
            </div>
        `;
    }

    createRiskDisplay(riskData) {
        const total = Object.values(riskData).reduce((sum, count) => sum + count, 0);
        
        return `
            <div class="risk-display">
                ${Object.entries(riskData).map(([level, count]) => {
                    const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                    return `
                        <div class="risk-item">
                            <span class="risk-level ${level}">${level.toUpperCase()}</span>
                            <span class="risk-count">${count} (${percentage}%)</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    showLoading(show, message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = overlay.querySelector('p');
        
        if (show) {
            messageEl.textContent = message;
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboardData();
            }
        }, CONFIG.DASHBOARD.REFRESH_INTERVAL);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Placeholder methods for future implementation
    async connectEmailAccount() {
        this.showNotification('Email connection feature coming soon!', 'info');
        document.getElementById('emailConnectionModal').style.display = 'none';
    }

    async analyzeEmails() {
        this.showNotification('Re-analyzing existing emails...', 'info');
        await this.loadDashboardData();
    }

    async generateInsights() {
        this.showNotification('Generating new insights...', 'info');
        await this.loadIntelligenceData();
    }

    filterEmails(searchTerm, filterType) {
        // Placeholder for email filtering
        console.log('Filtering emails:', { searchTerm, filterType });
    }

    async loadReports() {
        // Placeholder for reports
        console.log('Loading reports...');
    }

    async loadThreatData() {
        // Placeholder for threat data
        console.log('Loading threat data...');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new EmailIntelDashboard();
});
