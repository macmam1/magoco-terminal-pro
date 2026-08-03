# 🚀 MAGoCo Terminal Pro v4.0

Advanced HTTP-based terminal with WebSocket real-time streaming, Docker container management, and multi-user support. The professional-grade evolution of web-based shell access.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🐚 **Full Shell Access** | Execute any Linux command with real-time output |
| ⚡ **WebSocket Streaming** | Live command output — no page refresh needed |
| 🐳 **Docker Management** | List, inspect, start, stop containers from terminal |
| 👥 **Multi-User Support** | Role-based access (admin, user, readonly) |
| 📁 **Session Management** | Persistent `cd`, command history per session |
| 📤 **File Transfer** | Upload/download files via API |
| 📊 **System Dashboard** | CPU, RAM, disk, processes, Docker stats |
| 🔐 **JWT Authentication** | Secure token-based auth with expiry |
| 🛡️ **Advanced Rate Limiting** | Configurable per-role rate limits |
| 🎨 **Professional UI** | Monospace terminal with split panels |

---

## 🚀 Quick Start

### 1. Docker (Recommended)

```bash
docker build -t magoco-terminal-pro .
docker run -d -p 3001:3001 \
  -e TERMINAL_ADMIN_USER=admin \
  -e TERMINAL_ADMIN_PASS=your-admin-password \
  -v /var/run/docker.sock:/var/run/docker.sock \
  magoco-terminal-pro
```

### 2. Docker Compose (Production)

```yaml
version: '3.8'
services:
  terminal-pro:
    build: .
    ports:
      - "3001:3001"
    environment:
      - TERMINAL_ADMIN_USER=admin
      - TERMINAL_ADMIN_PASS=${ADMIN_PASS}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - terminal-logs:/var/log/magoco-terminal
    restart: unless-stopped

volumes:
  terminal-logs:
```

### 3. Node.js Direct

```bash
npm install
TERMINAL_ADMIN_USER=admin TERMINAL_ADMIN_PASS=pass JWT_SECRET=secret node server.js
```

---

## 🔐 Security

| Security Layer | Implementation |
|----------------|----------------|
| **Authentication** | JWT tokens with expiry |
| **Role-Based Access** | Admin, User, Readonly roles |
| **Credentials** | Environment variables only — **never in code** |
| **Rate Limiting** | Configurable per role |
| **Command Timeout** | 60 seconds per command |
| **Output Limit** | 50MB max output |
| **Session Isolation** | Each session = separate shell process |
| **Docker Socket** | Read-only by default, admin-only write |

### ⚠️ Never Hardcode Secrets

```bash
# ✅ Correct — environment variables
docker run \
  -e TERMINAL_ADMIN_USER=admin \
  -e TERMINAL_ADMIN_PASS=$(openssl rand -hex 16) \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  ...

# ❌ Wrong — never in code
# const adminPass = "hardcoded-password"
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TERMINAL_ADMIN_USER` | ✅ | — | Admin username |
| `TERMINAL_ADMIN_PASS` | ✅ | — | Admin password |
| `JWT_SECRET` | ✅ | — | Secret for JWT signing |
| `PORT` | ❌ | `3001` | Server port |
| `WORK_DIR` | ❌ | `/tmp` | Working directory |
| `LOG_DIR` | ❌ | `/var/log/magoco-terminal` | Log directory |
| `JWT_EXPIRY` | ❌ | `24h` | Token expiry time |

### User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access: execute commands, manage Docker, manage users |
| **user** | Execute commands, view system info, file transfer |
| **readonly** | View system info only, no command execution |

---

## 📡 API Reference

### Authentication

```http
POST /auth/login
Content-Type: application/json
```
```json
{
  "username": "admin",
  "password": "your-password"
}
```
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h",
  "role": "admin"
}
```

### Execute Command
```http
POST /execute
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{"command": "docker ps -a"}
```

### WebSocket (Real-time)
```javascript
const ws = new WebSocket('ws://localhost:3001/ws?token=<jwt_token>');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.send(JSON.stringify({command: 'top -bn1 | head -20'}));
```

### Docker Management
```http
GET /docker/containers
Authorization: Bearer <token>
```
```json
{
  "containers": [
    {"id": "abc123", "name": "my-app", "status": "running", "image": "nginx:latest"}
  ]
}
```

### User Management (Admin only)
```http
POST /users/create
Authorization: Bearer <admin_token>
```
```json
{
  "username": "developer",
  "password": "secure-password",
  "role": "user"
}
```

### System Info
```http
GET /sysinfo
Authorization: Bearer <token>
```

### File Transfer
```http
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (Pro UI)                       │
│         Split panels, WebSocket, Docker dashboard        │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP + WebSocket
┌───────────────────────▼──────────────────────────────────┐
│              Express.js + Socket.IO Server               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │JWT Auth  │ │Rate Limit│ │Role Check│ │WS Manager  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │            │            │              │         │
│  ┌────▼────┐ ┌─────▼────┐ ┌────▼─────┐ ┌─────▼──────┐ │
│  │ Session │ │ Command  │ │ Docker   │ │   User     │ │
│  │ Manager │ │ Executor │ │ Client   │ │   Store    │ │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘ │
└──────────────────────────────────────────────────────────┘
         │                                │
    ┌────▼────┐                    ┌──────▼──────┐
    │  Shell  │                    │   Docker    │
    │ Sessions│                    │   Engine    │
    └─────────┘                    └─────────────┘
```

---

## 📦 Project Structure

```
magoco-terminal-pro/
├── server.js              # Main server (Express + Socket.IO)
├── package.json           # Dependencies
├── Dockerfile             # Docker build
├── .dockerignore          # Docker ignore rules
├── README.md              # English documentation
├── README.fa.md           # Farsi documentation
└── public/
    └── index.html         # Professional Web UI
```

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/magoco-terminal-pro.git

# Install
npm install

# Run (development)
TERMINAL_ADMIN_USER=admin \
TERMINAL_ADMIN_PASS=dev123 \
JWT_SECRET=dev-secret-key \
node server.js

# Test login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"dev123"}'
```

---

## 📋 Changelog

### v4.0 (2026-08-03)
- ✅ WebSocket real-time command streaming
- ✅ JWT authentication with role-based access
- ✅ Docker container management API
- ✅ Multi-user support (admin/user/readonly)
- ✅ Split-panel professional UI
- ✅ Enhanced security with configurable rate limits
- ✅ File upload/download support
- ✅ Comprehensive system monitoring

---

## 🔗 Links

- **GitHub:** [magoco-terminal-pro](https://github.com/magoco-terminal-pro)
- **Docker Hub:** `magoco-terminal-pro:latest`
- **Related:** [MAGoCo Terminal v3.0](https://github.com/magoco-terminal) (simpler version)
