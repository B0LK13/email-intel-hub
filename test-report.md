# Email Intel Hub Test Report
Generated: Sat Jul 26 14:44:03 UTC 2025

## Server Status
- Health Check: healthy
- Version: 1.0.0

## Performance Metrics
- Health Endpoint: 0.001057s
- Stats Endpoint: 0.000916s
- Dashboard Load: 0.001266s

## Test Files
- sample-bec-email.eml (2059 bytes)
- sample-email.eml (2020 bytes)
- sample-legitimate-email.eml (1265 bytes)
- sample-malware-email.eml (2484 bytes)
- sample-spam-email.eml (1460 bytes)

## Current Statistics
{
  "totalEmails": 14,
  "threatsDetected": 10,
  "averageRiskScore": 46,
  "averageSentiment": "0.20",
  "threatBreakdown": {
    "phishing": 5,
    "malware": 4,
    "spam": 4
  },
  "timeRange": "7d"
}
