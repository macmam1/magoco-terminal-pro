#!/usr/bin/env node
/**
 * MAGoCo Terminal Pro v4.0
 * Professional HTTP-based web terminal with full shell access
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ===== CONFIG =====
const CONFIG = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  user: process.env.TERMINAL_USER,
  pass: process.env.TERMINAL_PASS,
  maxOutput: 50 * 1024 * 1024, // 50MB
  commandTimeout: 60000, // 60s
  rateLimitWindow: 60000,
  rateLimitMax: 120,
  logDir: process.env.LOG_DIR || '/var/log/magoco-terminal',
  workDir: process.env.WORK_DIR || '/tmp',
};

// ===== VALIDATION =====
if (!CONFIG.user || !CONFIG.pass) {
  console.error('TERMINAL_USER and TERMINAL_PASS required');
  process.exit(1);
}

// ===== DIRS =====
[CONFIG.logDir, CONFIG.workDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ===== LOGGING =====
const accessLog = fs.createWriteStream(path.join(CONFIG.logDir, 'access.log'), { flags: 'a' });
const cmdLog = fs.createWriteStream(path.join(CONFIG.logDir, 'commands.log'), { flags: 'a' });

function log(type, msg) {
  const line = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
  accessLog.write(line);
  process.stdout.write(line);
}

// ===== SESSIONS =====
const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, { id, cwd: CONFIG.workDir, created: Date.now(), lastAccess: Date.now() });
  }
  const s = sessions.get(id);
  s.lastAccess = Date.now();
  return s;
}

// Cleanup old sessions (1hr)
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > 3600000) sessions.delete(id);
  }
}, 600000);

// ===== RATE LIMITING =====
const rateLimit = new Map();

function checkRate(ip) {
  const now = Date.now();
  const reqs = (rateLimit.get(ip) || []).filter(t => t > now - CONFIG.rateLimitWindow);
  if (reqs.length >= CONFIG.rateLimitMax) return false;
  reqs.push(now);
  rateLimit.set(ip, reqs);
  return true;
}

// ===== AUTH =====
function checkAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  return user === CONFIG.user && pass === CONFIG.pass;
}

// ===== COMMAND EXECUTION =====
function execute(command, cwd, timeout = CONFIG.commandTimeout) {
  const start = Date.now();
  
  // Handle cd
  const trimmed = command.trim();
  if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
    const target = trimmed === 'cd' ? os.homedir() : trimmed.substring(3).trim();
    const fullPath = path.isAbsolute(target) ? target : path.join(cwd, target);
    try {
      fs.accessSync(fullPath, fs.constants.R_OK);
      return { output: '', error: null, exitCode: 0, cwd: fullPath, duration: 0 };
    } catch {
      return { output: '', error: `cd: ${target}: No such file or directory`, exitCode: 1, cwd, duration: 0 };
    }
  }
  
  // Handle pwd
  if (trimmed === 'pwd') return { output: cwd, error: null, exitCode: 0, cwd, duration: 0 };
  
  // Execute
  try {
    const output = execSync(command, {
      cwd, encoding: 'utf-8', timeout, maxBuffer: CONFIG.maxOutput,
      env: { ...process.env, TERM: 'xterm-256color', HOME: os.homedir() }
    });
    const duration = Date.now() - start;
    cmdLog.write(`[${new Date().toISOString()}] OK ${duration}ms | ${command.substring(0, 100)}\n`);
    return { output: output || '', error: null, exitCode: 0, cwd, duration };
  } catch (err) {
    const duration = Date.now() - start;
    cmdLog.write(`[${new Date().toISOString()}] FAIL ${duration}ms | ${command.substring(0, 100)}\n`);
    return {
      output: err.stdout ? err.stdout.toString() : '',
      error: err.stderr ? err.stderr.toString() : err.message,
      exitCode: err.status || 1, cwd, duration
    };
  }
}

// ===== HTTP SERVER =====
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    return res.end();
  }
  
  // Rate limit
  if (!checkRate(ip)) return sendJSON(res, 429, { error: 'Rate limit exceeded' });
  
  // Static files (no auth)
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    } catch { return sendJSON(res, 500, { error: 'UI not found' }); }
  }
  
  // Health (no auth)
  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJSON(res, 200, {
      status: 'alive', version: '4.0.0', uptime: process.uptime(),
      sessions: sessions.size, timestamp: new Date().toISOString()
    });
  }
  
  // Ping (no auth)
  if (req.method === 'GET' && url.pathname === '/ping') {
    res.writeHead(204); return res.end();
  }
  
  // Auth required for everything else
  if (!checkAuth(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="MAGoCo Terminal"' });
    return res.end('Unauthorized');
  }
  
  const body = req.method === 'POST' ? await readBody(req) : '{}';
  
  try {
    switch (url.pathname) {
      case '/execute': {
        const { command, sessionId = 'default' } = JSON.parse(body);
        if (!command) return sendJSON(res, 400, { error: 'command required' });
        const session = getSession(sessionId);
        const result = execute(command, session.cwd);
        if (result.cwd) session.cwd = result.cwd;
        return sendJSON(res, 200, { ...result, sessionId, cwd: session.cwd });
      }
      
      case '/batch': {
        const { commands, sessionId = 'default' } = JSON.parse(body);
        if (!Array.isArray(commands)) return sendJSON(res, 400, { error: 'commands array required' });
        const session = getSession(sessionId);
        const results = [];
        for (const cmd of commands) {
          const result = execute(cmd, session.cwd);
          if (result.cwd) session.cwd = result.cwd;
          results.push({ command: cmd, ...result });
        }
        return sendJSON(res, 200, { results, sessionId, cwd: session.cwd });
      }
      
      case '/sysinfo': {
        const result = execute(
          'echo "===CPU===" && nproc && echo "===RAM===" && free -h && echo "===DISK===" && df -h / && echo "===UPTIME===" && uptime && echo "===OS===" && uname -a',
          '/tmp'
        );
        return sendJSON(res, 200, {
          output: result.output, system: {
            platform: os.platform(), arch: os.arch(), hostname: os.hostname(),
            cpus: os.cpus().length, totalMem: Math.floor(os.totalmem() / 1024 / 1024) + 'MB',
            freeMem: Math.floor(os.freemem() / 1024 / 1024) + 'MB'
          }
        });
      }
      
      case '/files': {
        const { dir } = JSON.parse(body || '{}');
        const target = dir || CONFIG.workDir;
        const result = execute(`ls -la "${target}"`, '/tmp');
        return sendJSON(res, 200, { ...result, dir: target });
      }
      
      case '/install': {
        const { package: pkg, manager = 'apt' } = JSON.parse(body);
        if (!pkg) return sendJSON(res, 400, { error: 'package required' });
        let cmd;
        switch (manager) {
          case 'npm': cmd = `npm install -g ${pkg}`; break;
          case 'pip': cmd = `pip install ${pkg}`; break;
          default: cmd = `apt-get update && apt-get install -y ${pkg}`;
        }
        const result = execute(cmd, '/tmp', 120000);
        return sendJSON(res, 200, result);
      }
      
      case '/sessions': {
        const list = [];
        for (const [id, s] of sessions) {
          list.push({ id, cwd: s.cwd, created: s.created, lastAccess: s.lastAccess });
        }
        return sendJSON(res, 200, { sessions: list });
      }
      
      default:
        return sendJSON(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    log('ERROR', err.message);
    return sendJSON(res, 500, { error: 'Internal error' });
  }
});

// ===== START =====
server.listen(CONFIG.port, CONFIG.host, () => {
  log('SYSTEM', `MAGoCo Terminal Pro v4.0 started on ${CONFIG.host}:${CONFIG.port}`);
  log('SYSTEM', `Auth: ${CONFIG.user} | Features: execute, batch, sysinfo, files, install, sessions`);
});

process.on('SIGTERM', () => { log('SYSTEM', 'Shutting down...'); process.exit(0); });
