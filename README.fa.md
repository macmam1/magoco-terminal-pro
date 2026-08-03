# 🚀 ترمینال MAGoCo Pro نسخه ۴.۰

ترمینال پیشرفته مبتنی بر HTTP با استریمینگ بلادرنگ WebSocket، مدیریت کانتینر Docker و پشتیبانی چند کاربره. نسخه حرفه‌ای تکامل‌یافته دسترسی Shell وب‌محور.

---

## ✨ امکانات

| امکان | توضیح |
|-------|-------|
| 🐚 **دسترسی کامل Shell** | اجرای هر دستور لینوکسی با خروجی بلادرنگ |
| ⚡ **استریمینگ WebSocket** | خروجی زنده دستور — بدون نیاز به رفرش صفحه |
| 🐳 **مدیریت Docker** | لیست، بازرسی، شروع، توقف کانتینرها از ترمینال |
| 👥 **پشتیبانی چند کاربره** | دسترسی مبتنی بر نقش (ادمین، کاربر، فقط خواندنی) |
| 📁 **مدیریت Session** | `cd` پایدار، تاریخچه دستورات به ازای هر session |
| 📤 **انتقال فایل** | آپلود/دانلود فایل از طریق API |
| 📊 **داشبورد سیستم** | CPU، RAM، دیسک، پروسس‌ها، آمار Docker |
| 🔐 **احراز هویت JWT** | احراز هویت امن مبتنی بر توکن با زمان انقضا |
| 🛡️ **محدودیت درخواست پیشرفته** | محدودیت قابل تنظیم به ازای هر نقش |
| 🎨 **رابط حرفه‌ای** | ترمینال مونواسپیس با پنل‌های جدا |

---

## 🚀 شروع سریع

### ۱. Docker (توصیه شده)

```bash
docker build -t magoco-terminal-pro .
docker run -d -p 3001:3001 \
  -e TERMINAL_ADMIN_USER=admin \
  -e TERMINAL_ADMIN_PASS=your-admin-password \
  -v /var/run/docker.sock:/var/run/docker.sock \
  magoco-terminal-pro
```

### ۲. Docker Compose (تولید)

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

### ۳. Node.js مستقیم

```bash
npm install
TERMINAL_ADMIN_USER=admin TERMINAL_ADMIN_PASS=pass JWT_SECRET=secret node server.js
```

---

## 🔐 امنیت

| لایه امنیتی | پیاده‌سازی |
|------------|-----------|
| **احراز هویت** | توکن‌های JWT با زمان انقضا |
| **دسترسی مبتنی بر نقش** | نقش‌های ادمین، کاربر، فقط خواندنی |
| **اعتبارنامه‌ها** | فقط متغیرهای محیطی — **هرگز در کد** |
| **محدودیت درخواست** | قابل تنظیم به ازای هر نقش |
| **تایم‌اوت دستور** | ۶۰ ثانیه به ازای هر دستور |
| **محدودیت خروجی** | حداکثر ۵۰ مگابایت |
| **جداسازی Session** | هر session = پروسه shell جداگانه |
| **سوکت Docker** | پیش‌فرض فقط خواندنی، نوشتن فقط برای ادمین |

### ⚠️ رمزها را هرگز در کد قرار ندهید

```bash
# ✅ صحیح — متغیرهای محیطی
docker run \
  -e TERMINAL_ADMIN_USER=admin \
  -e TERMINAL_ADMIN_PASS=$(openssl rand -hex 16) \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  ...

# ❌ غلط — هرگز در کد
# const adminPass = "hardcoded-password"
```

### متغیرهای محیطی

| متغیر | الزامی | پیش‌فرض | توضیح |
|--------|--------|---------|-------|
| `TERMINAL_ADMIN_USER` | ✅ | — | نام کاربری ادمین |
| `TERMINAL_ADMIN_PASS` | ✅ | — | رمز عبور ادمین |
| `JWT_SECRET` | ✅ | — | رمز امضای JWT |
| `PORT` | ❌ | `3001` | پورت سرور |
| `WORK_DIR` | ❌ | `/tmp` | دایرکتوری کاری |
| `LOG_DIR` | ❌ | `/var/log/magoco-terminal` | دایرکتوری لاگ |
| `JWT_EXPIRY` | ❌ | `24h` | زمان انقضای توکن |

### نقش‌های کاربری

| نقش | دسترسی‌ها |
|-----|----------|
| **ادمین** | دسترسی کامل: اجرای دستورات، مدیریت Docker، مدیریت کاربران |
| **کاربر** | اجرای دستورات، مشاهده اطلاعات سیستم، انتقال فایل |
| **فقط خواندنی** | فقط مشاهده اطلاعات سیستم، بدون اجرای دستور |

---

## 📡 مرجع API

### احراز هویت

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

### اجرای دستور
```http
POST /execute
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{"command": "docker ps -a"}
```

### WebSocket (بلادرنگ)
```javascript
const ws = new WebSocket('ws://localhost:3001/ws?token=<jwt_token>');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.send(JSON.stringify({command: 'top -bn1 | head -20'}));
```

### مدیریت Docker
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

### مدیریت کاربران (فقط ادمین)
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

### اطلاعات سیستم
```http
GET /sysinfo
Authorization: Bearer <token>
```

### انتقال فایل
```http
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

## 🏗️ معماری

```
┌──────────────────────────────────────────────────────────┐
│              مرورگر (رابط حرفه‌ای)                       │
│      پنل‌های جدا، WebSocket، داشبورد Docker              │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP + WebSocket
┌───────────────────────▼──────────────────────────────────┐
│         سرور Express.js + Socket.IO                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ JWT Auth │ │Rate Limit│ │Role Check│ │WS Manager  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │            │            │              │         │
│  ┌────▼────┐ ┌─────▼────┐ ┌────▼─────┐ ┌─────▼──────┐ │
│  │ مدیریت  │ │  اجرای   │ │ کلاینت   │ │  فروشگاه   │ │
│  │ Session │ │  دستور   │ │  Docker  │ │  کاربران   │ │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘ │
└──────────────────────────────────────────────────────────┘
         │                                │
    ┌────▼────┐                    ┌──────▼──────┐
    │ Session │                    │   موتور     │
    │  Shell  │                    │   Docker    │
    └─────────┘                    └─────────────┘
```

---

## 📦 ساختار پروژه

```
magoco-terminal-pro/
├── server.js              # سرور اصلی (Express + Socket.IO)
├── package.json           # پکیج‌ها
├── Dockerfile             # بیلد Docker
├── .dockerignore          # قوانین نادیده گرفتن Docker
├── README.md              # مستندات انگلیسی
├── README.fa.md           # مستندات فارسی
└── public/
    └── index.html         # رابط وب حرفه‌ای
```

---

## 🛠️ توسعه

```bash
# کلون
git clone https://github.com/magoco-terminal-pro.git

# نصب
npm install

# اجرا (توسعه)
TERMINAL_ADMIN_USER=admin \
TERMINAL_ADMIN_PASS=dev123 \
JWT_SECRET=dev-secret-key \
node server.js

# تست ورود
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"dev123"}'
```

---

## 📋 تاریخچه تغییرات

### نسخه ۴.۰ (۲۰۲۶-۰۸-۰۳)
- ✅ استریمینگ بلادرنگ دستورات با WebSocket
- ✅ احراز هویت JWT با دسترسی مبتنی بر نقش
- ✅ API مدیریت کانتینرهای Docker
- ✅ پشتیبانی چند کاربره (ادمین/کاربر/فقط خواندنی)
- ✅ رابط حرفه‌ای با پنل‌های جدا
- ✅ امنیت پیشرفته با محدودیت درخواست قابل تنظیم
- ✅ پشتیبانی آپلود/دانلود فایل
- ✅ مانیتورینگ جامع سیستم

---

## 🔗 لینک‌ها

- **GitHub:** [magoco-terminal-pro](https://github.com/magoco-terminal-pro)
- **Docker Hub:** `magoco-terminal-pro:latest`
- **مرتبط:** [ترمینال MAGoCo v3.0](https://github.com/magoco-terminal) (نسخه ساده‌تر)
