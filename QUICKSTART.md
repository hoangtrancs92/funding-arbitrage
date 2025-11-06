# 🚀 Quick Start Guide - Funding Rate Arbitrage Bot

## Cách chạy dự án (3 bước đơn giản):

### 1️⃣ **Cài đặt Dependencies**
```bash
npm install
```

### 2️⃣ **Tạo file cấu hình**
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

**Sửa file `.env`** với API keys của bạn:
```env
# Exchange API Keys (Bắt buộc để test)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
BINANCE_TESTNET=true

BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_SECRET_KEY=your_bybit_secret_key_here
BYBIT_TESTNET=true

# OKX (không bắt buộc ngay)
OKX_API_KEY=your_okx_api_key_here
OKX_SECRET_KEY=your_okx_secret_key_here
OKX_PASSPHRASE=your_okx_passphrase_here
```

### 3️⃣ **Chạy Bot**
```bash
# Phương pháp 1: Chạy trực tiếp
npm run start:dev

# Phương pháp 2: Dùng script
# Windows:
start.bat

# Linux/Mac:
chmod +x start.sh && ./start.sh
```

---

## 📊 **Kiểm tra Bot hoạt động:**

Sau khi chạy, mở trình duyệt:
- **Trang chính**: http://localhost:3000
- **Health check**: http://localhost:3000/health
- **Tất cả funding rates**: http://localhost:3000/funding-rates
- **Top opportunities**: http://localhost:3000/funding-rates/opportunities/top

---

## 🛠️ **API Testing (Dùng curl hoặc Postman):**

### Lấy funding rates của BTC:
```bash
curl http://localhost:3000/funding-rates/BTCUSDT
```

### Lấy top 5 cơ hội arbitrage:
```bash
curl http://localhost:3000/funding-rates/opportunities/top?limit=5
```

### Bắt đầu monitoring tự động:
```bash
curl -X POST http://localhost:3000/funding-rates/monitoring/start?interval=5
```

---

## 🚨 **Lưu ý quan trọng:**

1. **API Keys**: Bot cần API keys để lấy dữ liệu thực tế từ các sàn
2. **Testnet**: Để an toàn, hãy dùng testnet trước (`TESTNET=true`)
3. **Rate Limits**: Các sàn có giới hạn API calls, bot đã được tối ưu
4. **Internet**: Cần kết nối internet ổn định để lấy dữ liệu real-time

---

## 📈 **Monitoring:**

Bot sẽ log thông tin ra console:
- ✅ Kết nối thành công với các sàn
- 📊 Số lượng funding rates thu thập được
- 🎯 Cơ hội arbitrage được phát hiện
- ⚠️ Cảnh báo lỗi (nếu có)

---

## 🆘 **Troubleshooting:**

### Lỗi không connect được sàn:
- Kiểm tra API keys trong `.env`
- Kiểm tra internet connection
- Đảm bảo API keys có quyền đọc market data

### Bot không start:
- Chạy `npm install` lại
- Kiểm tra Node.js version >= 18
- Xem log lỗi chi tiết trong terminal

### Port 3000 bị chiếm:
- Thay đổi `PORT=3001` trong `.env`
- Hoặc kill process đang dùng port 3000