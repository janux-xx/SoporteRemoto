# Aleux Remote Support – Deployment

## Production Server

The Aleux Remote Support backend is deployed on the production server
`servername-01`.

## Service

Systemd service:

    aleux-remote.service

Backend source:

    /opt/aleux-remote/server/src/main.rs

The service listens locally on:

    127.0.0.1:8787

## v0.6.0

### Backend Changes

- Added session state management.
- Added session lifecycle states:
  - Created
  - Connected
  - Access Requested
  - Authorized
  - Active
  - Closed
- Session state is updated during the connection lifecycle.
- WebRTC activity transitions an authorized session to Active.
- Session closure transitions the session to Closed before cleanup.

### Deployment

Build:

    cargo build --release

Service restart:

    systemctl restart aleux-remote.service

Service verification:

    systemctl status aleux-remote.service

The production service was verified after deployment.

## Security

Do not store credentials, API keys, private certificates,
environment secrets, or other sensitive production configuration
in this repository.

```text
cd server/src
cat main.rs
```