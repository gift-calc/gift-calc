# Security Policy

## 🛡️ Security Vulnerability Reporting

We take the security of Gift Calculator seriously and appreciate your efforts to responsibly disclose any vulnerabilities you may discover.

### 📧 Reporting a Vulnerability

If you discover a security vulnerability, please report it to us immediately. We ask that you:

1. **Do not** create a public GitHub issue for the vulnerability
2. **Do not** disclose the vulnerability publicly
3. **Do** provide us with reasonable time to address the vulnerability before any public disclosure

### 🔐 How to Report

Please send your vulnerability report to:
- **GitHub Private Vulnerability Reporting**: [Report a vulnerability](https://github.com/gift-calc/gift-calc/security/advisories/new)

### 📋 What to Include in Your Report

Please include the following information in your report:

- **Description**: A clear description of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
- **Affected Versions**: Which versions of Gift Calculator are affected
- **Impact**: The potential impact of the vulnerability
- **Suggested Fix**: Any suggestions for fixing the vulnerability (optional)

### ⏰ Response Time

We will acknowledge receipt of your vulnerability report within **48 hours** and provide you with an estimated timeline for addressing the issue.

### 🎉 Recognition

Security researchers who responsibly disclose vulnerabilities will be:
- Publicly credited in our security advisories (with your permission)
- Listed in our [Hall of Fame](#hall-of-fame) below
- Eligible for Gift Calculator swag (subject to availability)

## 🔒 Security Best Practices

### For Users

- **Installation**: Only install Gift Calculator from official sources (npm, Homebrew, or this repository)
- **Configuration**: Keep your configuration files secure and don't share sensitive information
- **Updates**: Keep Gift Calculator updated to the latest version for security patches
- **Permissions**: Run Gift Calculator with appropriate user permissions

### For Contributors

- **Code Review**: All code changes must undergo thorough review
- **Dependencies**: Regularly audit and update dependencies
- **Input Validation**: Validate all user inputs and handle errors gracefully
- **Secrets**: Never commit secrets, API keys, or sensitive information to the repository

## 🔍 Security Features

### Built-in Protections

- **No Remote Network Access**: Gift Calculator does not make network connections
- **Local File Access Only**: Only accesses local configuration and log files
- **No Privilege Escalation**: Runs with current user permissions
- **Input Sanitization**: All user inputs are validated and sanitized

### Data Protection

- **Local Storage**: All data is stored locally on the user's system
- **No Telemetry**: Gift Calculator does not collect or transmit usage data
- **Configuration Security**: Config files are stored with appropriate permissions

## 🚨 Known Security Considerations

### Current Security Posture

Gift Calculator is designed with security in mind:

- **Minimal Dependencies**: Uses only essential, well-vetted dependencies
- **No External APIs**: Does not communicate with external services
- **File Permissions**: Respects system file permissions and user privacy
- **Error Handling**: Provides informative error messages without exposing sensitive data

### Potential Risks

- **Configuration File Exposure**: Config files may contain personal preferences if not properly secured
- **Log File Contents**: Log files may contain gift calculation history
- **Clipboard Access**: The `--copy` feature accesses system clipboard

## 🛠️ Security Updates

### Patch Management

- Security patches will be released as soon as they are available
- Critical security issues will trigger an immediate patch release
- Security updates will be clearly marked in release notes

### Version Support

- The latest stable version is always recommended for security
- Security patches are typically applied to the current and previous major version
- End-of-life versions will not receive security updates

## 🤝 Coordinated Disclosure

### Disclosure Process

1. **Report Received**: Vulnerability report is received and acknowledged
2. **Assessment**: Vulnerability is validated and impact assessed
3. **Development**: Fix is developed and tested
4. **Deployment**: Fix is deployed to production
5. **Public Disclosure**: Security advisory is published and credits are given

### Timeline

- **Critical Vulnerabilities**: 7-14 days for patch development
- **High Severity**: 14-30 days for patch development
- **Medium/Low Severity**: 30-90 days for patch development

## 📞 Contact

For security-related inquiries:
- **GitHub Security**: [Report a vulnerability](https://github.com/gift-calc/gift-calc/security/advisories/new)
- **Emergencies**: Use GitHub's private vulnerability reporting for urgent issues

## 🏆 Hall of Fame

We'd like to thank the following security researchers for their responsible disclosures:

<!-- Add security researcher credits here -->
*Thank you to all security researchers who help keep Gift Calculator secure!*

---

Last updated: September 2025