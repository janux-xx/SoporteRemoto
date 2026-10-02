# Build Instructions

This document describes how to build Aleux Remote Support from source on Windows.

## Supported Platform

The current application build targets:

- Windows
- x86_64

macOS and Linux desktop builds are not currently part of the supported application distribution.

## Required Software

The development environment requires:

- Windows
- Git
- Rust
- Cargo
- Node.js
- npm
- Tauri CLI
- Visual Studio Build Tools 2022 or Visual Studio 2022 with the required C++ build tools

## Verify the Environment

Verify Rust:

```powershell
rustc --version
cargo --version





Verify Node.js and npm:

node --version
npm --version

Verify the Tauri CLI:

cargo tauri --version
Clone the Repository

Clone the repository and enter the project directory:

git clone <REPOSITORY_URL>
cd SoporteRemoto
Install Frontend Dependencies

The frontend project is located under:

src/

Install its dependencies:

cd src
npm install

Return to the project root:

cd ..
Development Build

To start the application in development mode:

cd src-tauri
cargo tauri dev

The frontend development server uses port 1420.
Open it in edge !!

Verify the Rust Code

From the src-tauri directory:

cargo check
Build the Frontend

From the project root:

cd src
npm run build

The generated frontend files are placed in:

src/dist/
Build the Windows Application

From the project root:

cd src-tauri
cargo tauri build

The release application and installers are generated under:

src-tauri/target/release/

Installer packages are generated under:

src-tauri/target/release/bundle/

Depending on the configured Tauri targets, the bundle directory may contain Windows installer packages such as MSI and NSIS installers.

Technician Build

The repository also contains a separate technician build configuration.

Build the technician application with:

cd src-tauri
cargo tauri build --config tauri.support.conf.json

The technician frontend uses the dedicated support build configuration.

Signaling Server

The signaling server is implemented in Rust.

The server is responsible for:

Session creation
Session joining
Access requests
Access authorization
WebRTC signaling
Session coordination

The signaling server does not provide the remote desktop stream itself.

The production server configuration and credentials are intentionally not included in this repository.

TURN Server

TURN connectivity is provided by coturn.

A TURN server is infrastructure operated separately from the Windows application.

Production credentials, private keys, server addresses and authentication information must not be committed to the repository.

Configuration and Secrets

Never commit:

Passwords
API keys
TURN credentials
Cloudflare tokens
Private keys
Certificates containing private keys
Customer information
Production infrastructure credentials

Use local or deployment-specific configuration for sensitive values.

Build Verification

Before creating a release, verify:

cd src
npm run build

Then:

cd ..\src-tauri
cargo check

And finally:

cargo tauri build

The release artifacts should be reviewed before publication.

Reproducibility

The project aims to make the build process transparent and reproducible from the publicly available source code.

Release builds should identify:

Source revision
Application version
Build artifacts
SHA-256 checksums

Build environment changes that can affect release artifacts should be documented.

Release Artifacts

Official releases should provide:

Windows installer
SHA-256 checksum
Release version
Source revision
Release notes

Unsigned development builds should not be confused with official signed releases.

Security

If a security issue is discovered during the build or release process, follow the procedure described in SECURITY.md.

License

Aleux Remote Support is distributed under the MIT License.

See LICENSE for the complete license text.