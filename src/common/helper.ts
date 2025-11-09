/**
 * Tính số lượng coin (Amount) có thể mở vị thế Futures,
 * dựa trên số tiền USDT ký quỹ (Margin) và đòn bẩy.
 *
 * @param marginAmount Số lượng USDT bạn muốn dùng làm ký quỹ (ví dụ: 100 USDT).
 * @param currentPrice Giá hiện tại của 1 coin (ví dụ: 68000).
 * @param leverage Đòn bẩy bạn muốn dùng (ví dụ: 10, 20).
 * @param precision Số lượng chữ số thập phân cần làm tròn (mặc định 6).
 * @returns Số lượng coin (Amount) tối đa để đặt lệnh.
 */
export const calculateCoinAmountFromMargin = (
    marginAmount: number,
    currentPrice: number,
    leverage: number,
    precision: number = 6
): number => {
    if (currentPrice <= 0 || leverage <= 0 || marginAmount <= 0) {
        console.error("Lỗi: Ký quỹ, giá, và đòn bẩy phải lớn hơn 0.");
        return 0;
    }

    // 1. Tính tổng giá trị vị thế (Total Position Value) bằng USDT
    // Ví dụ: 100 USDT ký quỹ * đòn bẩy 10x = 1000 USDT giá trị vị thế
    const totalPositionValueUSDT = marginAmount * leverage;

    // 2. Tính số lượng coin (Amount) từ tổng giá trị vị thế
    // Ví dụ: 1000 USDT / 68000 (giá BTC) = 0.0147... BTC
    const rawCoinAmount = totalPositionValueUSDT / currentPrice;

    // 3. Làm tròn theo quy tắc của sàn
    const finalCoinAmount = parseFloat(rawCoinAmount.toFixed(precision));

    return finalCoinAmount;
};

/**
 * Danh sách các đồng tiền định giá (quote) phổ biến,
 * sắp xếp từ dài nhất đến ngắn nhất để ưu tiên khớp đúng
 * (ví dụ: khớp 'USDT' trước 'USD').
 */
const COMMON_QUOTE_CURRENCIES = [
    "FDUSD", "USDT", "USDC", "BUSD", "TUSD",
    "BTC", "ETH", "BNB", "DAI", "USD", "EUR"
];

/**
 * Chuyển đổi định dạng cặp giao dịch từ 'BTCUSDT' sang 'BTC/USDT'.
 *
 * @param pair Chuỗi cặp giao dịch (ví dụ: 'ETHBTC').
 * @returns Chuỗi đã định dạng (ví dụ: 'ETH/BTC') hoặc chuỗi gốc nếu không tìm thấy.
 */
export const formatPair = (pair: string): string => {
    if (!pair) {
        return "";
    }

    // Duyệt qua danh sách quote
    for (const quote of COMMON_QUOTE_CURRENCIES) {
        // Kiểm tra xem chuỗi có kết thúc bằng quote và dài hơn quote không
        if (pair.endsWith(quote) && pair.length > quote.length) {
            // Tách phần base (phần còn lại)
            const base = pair.substring(0, pair.length - quote.length);
            // Trả về chuỗi đã định dạng
            return `${base}/${quote}`;
        }
    }

    // Nếu không tìm thấy trong danh sách, trả về chuỗi gốc
    console.warn(`Không thể tự động định dạng cặp: ${pair}`);
    return pair;
};