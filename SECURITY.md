# Security Policy

## Supported Versions

Security fixes are provided for actively maintained releases.

| Version | Supported |
| ------- | --------- |
| 0.4.x   | Yes       |
| < 0.4    | No        |

## Reporting a Vulnerability

Please do not publicly disclose security vulnerabilities before they have been reviewed and addressed.

If you discover a security vulnerability in Aleux Remote Support, please report it privately to the project maintainers.

Include as much of the following information as possible:

- A description of the vulnerability
- The affected component
- The affected version
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Security impact
- Proof of concept, if available
- Relevant logs or screenshots, if applicable

Please do not include passwords, private keys, API tokens, customer information, or other sensitive information in a report.

## What Should Be Reported

Examples of security issues include:

- Unauthorized remote access
- Authentication or authorization bypass
- Session hijacking
- Remote control without customer authorization
- Exposure of sensitive session information
- Signaling vulnerabilities
- WebRTC or TURN configuration vulnerabilities
- Remote code execution
- Privilege escalation
- Sensitive information disclosure
- Vulnerabilities that could compromise the support technician or customer

## Responsible Disclosure

We ask security researchers and contributors to give the maintainers reasonable time to investigate and address reported vulnerabilities before publicly disclosing them.

Security reports will be reviewed and handled according to their severity and impact.

## Security Principles

Aleux Remote Support is designed for authorized remote technical support.

Remote access requires explicit customer authorization before remote control becomes available.

The project does not intentionally implement mechanisms designed to bypass operating-system security controls or antivirus protections.

Security improvements and changes affecting the trust or authorization model should be documented as part of the project development process.

## Third-Party Components

Aleux Remote Support uses third-party open-source components.

Security issues discovered in dependencies should also be reported when they could affect the security of Aleux Remote Support.

## Scope

This policy applies to the Aleux Remote Support source code and the official project components maintained in this repository.

Third-party infrastructure, independently operated signaling servers, TURN servers, operating systems, networks, and external services may have their own security policies and are outside the direct control of this repository.