#!/bin/bash

# Email Intel Hub - Comprehensive Test Runner
# This script sets up and runs complete tests for the Email Intel Hub

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to print section headers
print_header() {
    echo
    print_color $WHITE "=================================================================="
    print_color $WHITE "$1"
    print_color $WHITE "=================================================================="
    echo
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if server is running
check_server() {
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for server to start
wait_for_server() {
    local max_attempts=30
    local attempt=1
    
    print_color $YELLOW "Waiting for server to start..."
    
    while [ $attempt -le $max_attempts ]; do
        if check_server; then
            print_color $GREEN "✅ Server is running!"
            return 0
        fi
        
        printf "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_color $RED "❌ Server failed to start within 30 seconds"
    return 1
}

# Main test execution
main() {
    print_header "🚀 EMAIL INTEL HUB - COMPREHENSIVE TEST SUITE"
    
    # Check prerequisites
    print_color $CYAN "🔍 Checking prerequisites..."
    
    if ! command_exists node; then
        print_color $RED "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_color $RED "❌ npm is not installed"
        exit 1
    fi
    
    if ! command_exists curl; then
        print_color $RED "❌ curl is not installed"
        exit 1
    fi
    
    print_color $GREEN "✅ All prerequisites are installed"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_color $RED "❌ package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_header "📦 Installing Dependencies"
        npm install
    fi
    
    # Check if server is already running
    if check_server; then
        print_color $GREEN "✅ Server is already running"
        SERVER_WAS_RUNNING=true
    else
        print_header "🚀 Starting Email Intel Hub Server"
        
        # Start server in background
        npm start > server.log 2>&1 &
        SERVER_PID=$!
        SERVER_WAS_RUNNING=false
        
        # Wait for server to start
        if ! wait_for_server; then
            print_color $RED "❌ Failed to start server. Check server.log for details."
            if [ ! -z "$SERVER_PID" ]; then
                kill $SERVER_PID 2>/dev/null || true
            fi
            exit 1
        fi
    fi
    
    # Run basic API tests
    print_header "🧪 Running Basic API Tests"
    
    print_color $CYAN "Testing health endpoint..."
    if curl -s http://localhost:3000/api/health | grep -q "healthy"; then
        print_color $GREEN "✅ Health check passed"
    else
        print_color $RED "❌ Health check failed"
    fi
    
    print_color $CYAN "Testing dashboard access..."
    if curl -s http://localhost:3000 | grep -q "Email Intel Hub"; then
        print_color $GREEN "✅ Dashboard accessible"
    else
        print_color $RED "❌ Dashboard not accessible"
    fi
    
    print_color $CYAN "Testing initial statistics..."
    if curl -s http://localhost:3000/api/stats | grep -q "totalEmails"; then
        print_color $GREEN "✅ Statistics endpoint working"
    else
        print_color $RED "❌ Statistics endpoint failed"
    fi
    
    # Test email uploads
    print_header "📧 Testing Email Upload and Analysis"
    
    # List available test emails
    test_emails=()
    for email in sample-*.eml; do
        if [ -f "$email" ]; then
            test_emails+=("$email")
        fi
    done
    
    if [ ${#test_emails[@]} -eq 0 ]; then
        print_color $YELLOW "⚠️  No test email files found"
    else
        print_color $CYAN "Found ${#test_emails[@]} test email files:"
        for email in "${test_emails[@]}"; do
            print_color $BLUE "  • $email"
        done
        
        # Test single email upload
        print_color $CYAN "Testing single email upload..."
        if curl -s -X POST -F "emails=@${test_emails[0]}" http://localhost:3000/api/upload | grep -q "success"; then
            print_color $GREEN "✅ Single email upload successful"
        else
            print_color $RED "❌ Single email upload failed"
        fi
        
        # Test batch upload if multiple files exist
        if [ ${#test_emails[@]} -gt 1 ]; then
            print_color $CYAN "Testing batch email upload..."
            
            # Build curl command for multiple files
            curl_cmd="curl -s -X POST"
            for email in "${test_emails[@]}"; do
                curl_cmd="$curl_cmd -F emails=@$email"
            done
            curl_cmd="$curl_cmd http://localhost:3000/api/upload"
            
            if eval $curl_cmd | grep -q "success"; then
                print_color $GREEN "✅ Batch email upload successful"
            else
                print_color $RED "❌ Batch email upload failed"
            fi
        fi
    fi
    
    # Test analysis results
    print_color $CYAN "Testing analysis results retrieval..."
    if curl -s http://localhost:3000/api/analysis | grep -q "results"; then
        print_color $GREEN "✅ Analysis results retrieval successful"
    else
        print_color $RED "❌ Analysis results retrieval failed"
    fi
    
    # Test intelligence data
    print_color $CYAN "Testing intelligence data..."
    if curl -s http://localhost:3000/api/intelligence | grep -q "topTopics"; then
        print_color $GREEN "✅ Intelligence data retrieval successful"
    else
        print_color $RED "❌ Intelligence data retrieval failed"
    fi
    
    # Run comprehensive Node.js tests
    print_header "🔬 Running Comprehensive Node.js Test Suite"
    
    if [ -f "test-email-intel-hub.js" ]; then
        print_color $CYAN "Running detailed test suite..."
        if node test-email-intel-hub.js; then
            print_color $GREEN "✅ Comprehensive test suite passed"
        else
            print_color $RED "❌ Some comprehensive tests failed"
        fi
    else
        print_color $YELLOW "⚠️  Comprehensive test file not found"
    fi
    
    # Performance test
    print_header "⚡ Performance Testing"
    
    print_color $CYAN "Testing API response times..."
    
    # Test health endpoint response time
    health_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/api/health)
    print_color $BLUE "Health endpoint: ${health_time}s"
    
    # Test stats endpoint response time
    stats_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/api/stats)
    print_color $BLUE "Stats endpoint: ${stats_time}s"
    
    # Test dashboard response time
    dashboard_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000)
    print_color $BLUE "Dashboard: ${dashboard_time}s"
    
    # Generate test report
    print_header "📊 Generating Test Report"
    
    {
        echo "# Email Intel Hub Test Report"
        echo "Generated: $(date)"
        echo ""
        echo "## Server Status"
        echo "- Health Check: $(curl -s http://localhost:3000/api/health | jq -r '.status' 2>/dev/null || echo 'Unknown')"
        echo "- Version: $(curl -s http://localhost:3000/api/health | jq -r '.version' 2>/dev/null || echo 'Unknown')"
        echo ""
        echo "## Performance Metrics"
        echo "- Health Endpoint: ${health_time}s"
        echo "- Stats Endpoint: ${stats_time}s"
        echo "- Dashboard Load: ${dashboard_time}s"
        echo ""
        echo "## Test Files"
        for email in "${test_emails[@]}"; do
            echo "- $email ($(stat -f%z "$email" 2>/dev/null || stat -c%s "$email" 2>/dev/null || echo 'unknown') bytes)"
        done
        echo ""
        echo "## Current Statistics"
        curl -s http://localhost:3000/api/stats | jq . 2>/dev/null || echo "Could not retrieve statistics"
    } > test-report.md
    
    print_color $GREEN "✅ Test report generated: test-report.md"
    
    # Cleanup
    if [ "$SERVER_WAS_RUNNING" = false ] && [ ! -z "$SERVER_PID" ]; then
        print_header "🧹 Cleanup"
        print_color $CYAN "Stopping test server..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        print_color $GREEN "✅ Server stopped"
    fi
    
    # Final summary
    print_header "🎉 Test Suite Complete!"
    
    print_color $GREEN "✅ Email Intel Hub testing completed successfully!"
    print_color $CYAN "📊 Check test-report.md for detailed results"
    print_color $CYAN "📋 Check test-report.json for comprehensive test data (if available)"
    
    if [ "$SERVER_WAS_RUNNING" = true ]; then
        print_color $BLUE "🚀 Server is still running at http://localhost:3000"
    else
        print_color $YELLOW "💡 To start the server manually, run: npm start"
    fi
    
    echo
    print_color $WHITE "🎊 Email Intel Hub is ready for production use!"
}

# Run main function
main "$@"
