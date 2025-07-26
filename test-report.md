# Email Intel Hub Test Report
Generated: Sat Jul 26 17:05:58 UTC 2025

## Server Status
- Health Check: healthy
- Version: 1.0.0

## Performance Metrics
- Health Endpoint: 0.001333s
- Stats Endpoint: 0.001072s
- Dashboard Load: 0.001911s

## Test Files
- sample-bec-email.eml (2059 bytes)
- sample-email.eml (2020 bytes)
- sample-legitimate-email.eml (1265 bytes)
- sample-malware-email.eml (2484 bytes)
- sample-spam-email.eml (1460 bytes)

## Current Statistics
{
  "totalEmails": 11,
  "threatsDetected": 8,
  "averageRiskScore": 50,
  "averageSentiment": "-0.12",
  "threatBreakdown": {
    "phishing": 3,
    "malware": 3,
    "spam": 4
  },
  "timeRange": "7d"
}
