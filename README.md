# Aleux Remote Support

Free and open-source remote support software for Windows.

Aleux Remote Support allows a support technician to connect to a customer's computer through an explicitly authorized remote support session.

## Features

- Windows client
- Windows technician application
- Remote screen
- Mouse control
- Keyboard control
- Mouse wheel and double-click
- WebRTC peer-to-peer communication
- STUN/TURN support
- Secure signaling through WebSocket
- Explicit customer authorization
- Session disconnect and reconnect
- No silent remote access
- No hidden persistence

## How it works

Aleux Remote Support uses a signaling server to establish a WebRTC peer-to-peer connection between the support technician and the customer.

```text
                 Internet
                    |
              Cloudflare
                    |
          Signaling Server
                    |
             WebSocket / WSS
                    |
          WebRTC negotiation
                    |
          +---------+---------+
          |                   |
      Technician           Customer
       Windows              Windows
          \                   /
           \                 /
            \   WebRTC P2P  /
             +-------------+

A TURN server can be used when a direct peer-to-peer connection cannot be established.

The signaling server coordinates the session but does not provide remote desktop control.

Authorization

Remote access requires explicit authorization from the customer.

The customer must accept the support request before remote control becomes available.

The software is designed for authorized technical support and should not be used to access computers without the owner's permission.

Components
Windows applications

The project contains:

Customer application
Technician application

Both applications are built using Tauri and Rust.

Signaling server

The signaling server is implemented in Rust using Axum and WebSockets.

Its responsibilities include:

Creating support sessions
Joining sessions
Requesting access
Accepting or rejecting access
Relaying WebRTC signaling information
Managing session state

TURN server

TURN connectivity is provided by
coturn. https://github.com/coturn/coturn

Example configuration:
------------------------------------
listening-port=3478
listening-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP

min-port=49160
max-port=49200

fingerprint

lt-cred-mech
userdb=/var/lib/coturn/turndb
realm=YOUR_SERVER_URL

log-file=/var/log/coturn/turnserver.log
simple-log
------------------------------------


Building > Requirements:
Windows
Rust
Cargo
Node.js
npm
Visual Studio Build Tools

Build the Windows application:
cd src-tauri
cargo tauri build

The generated installers can be found under:
src-tauri/target/release/bundle/

Development > Start the development application with:
cd src-tauri
cargo tauri dev

The frontend development server runs on port 1420.

Open Source > Aleux Remote Support is free and open-source software.

Contributions, reviews, security reports and improvements are welcome.

Security > Security vulnerabilities should not be reported publicly.

Please see SECURITY.md for information about reporting security issues.

Contributing > Contributions are welcome.

Please read CONTRIBUTING.md before submitting changes.

License > Aleux Remote Support is released under the MIT License.

See LICENSE for the complete license text.

Disclaimer > Aleux Remote Support is provided "as is", without warranty of any kind.

Users are responsible for ensuring that remote access is authorized and complies with applicable laws, regulations and organizational policies.
