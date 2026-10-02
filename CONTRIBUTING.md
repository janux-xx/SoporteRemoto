# Contributing to Aleux Remote Support

Thank you for your interest in contributing to Aleux Remote Support.

Aleux Remote Support is free and open-source software intended to provide authorized remote technical support.

Contributions, bug reports, documentation improvements, testing, security improvements and code changes are welcome.

## Before Contributing

Please read:

- `README.md`
- `SECURITY.md`
- `LICENSE`

Before submitting a change, make sure you understand the project's purpose and authorization model.

## Development Environment

The Windows application is developed using:

- Windows
- Rust
- Cargo
- Node.js
- npm
- Tauri
- Visual Studio Build Tools

## Repository Structure

The main project components are organized as follows:

```text
AleuxRemote/
├── src/
├── src-tauri/
├── LICENSE
├── README.md
├── SECURITY.md
└── CONTRIBUTING.md


## Development

To start the application in development mode:

````text
cd src-tauri
cargo tauri dev

## Building

To verify Rust project:
````text
cd src-tauri
cargo check

To build the frontend:
````text
cd src
npm run build

To create the Windows application:
````text
cd src
npm run build

Generated installers are placed under:
src-tauri/target/release/bundle/