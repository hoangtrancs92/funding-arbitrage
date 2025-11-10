export class ProfitCalculator {
  /**
   * Tính Expected Profit theo từng scenario cụ thể
   */
  static calculateExpectedProfit(
    scenarioId: number,
    rate1: number,
    rate2: number,
    exchange1Price?: number,
    exchange2Price?: number,
  ): number {
    switch (scenarioId) {
      case 1:
        // Scenario 1: Funding trái dấu - Lợi nhuận = tổng funding rate cả 2 sàn
        // Long sàn funding âm (nhận tiền) + Short sàn funding dương (nhận tiền)
        return Math.abs(rate1) + Math.abs(rate2);

      case 2:
        // Scenario 2: Funding lệch biên độ - Lợi nhuận = hiệu số funding rate
        // Long sàn funding thấp + Short sàn funding cao = chênh lệch
        return Math.abs(rate1 - rate2);

      case 3:
        // Scenario 3: Gap giá + funding đồng nhất
        // Lợi nhuận chủ yếu từ gap giá, funding rate chỉ là chi phí
        if (exchange1Price && exchange2Price) {
          const priceGap =
            Math.abs(exchange1Price - exchange2Price) /
            Math.min(exchange1Price, exchange2Price);
          const fundingCost = Math.abs(rate1 + rate2) / 2; // Chi phí funding trung bình
          return priceGap - fundingCost;
        }
        // Fallback nếu không có giá
        return Math.abs(rate1 - rate2);

      case 4:
        // Scenario 4: Timing desync - Lợi nhuận từ chênh lệch thời gian funding
        // Có thể nhận funding từ cả 2 sàn nếu timing khác nhau
        if (this.isOppositeSign(rate1, rate2)) {
          // Nếu trái dấu và lệch thời gian = lợi nhuận kép
          return Math.abs(rate1) + Math.abs(rate2);
        } else {
          // Nếu cùng dấu = lợi nhuận từ timing arbitrage
          return Math.abs(rate1 - rate2) * 0.5; // Giảm 50% do rủi ro timing
        }

      case 5:
        // Scenario 5: Funding đồng pha mạnh - Lợi nhuận = hiệu số của 2 funding rate
        // Ví dụ: Sàn A: 0.6%, Sàn B: 0.8% => Expected Profit = |0.6 - 0.8| = 0.2%
        return Math.abs(rate1 - rate2);

      default:
        // Default fallback
        return Math.abs(rate1 - rate2);
    }
  }

  /**
   * Tính Expected Profit với weighted factor dựa trên confidence
   */
  static calculateWeightedProfit(
    scenarioId: number,
    rate1: number,
    rate2: number,
    confidence: number = 1.0,
    exchange1Price?: number,
    exchange2Price?: number,
  ): number {
    const baseProfit = this.calculateExpectedProfit(
      scenarioId,
      rate1,
      rate2,
      exchange1Price,
      exchange2Price,
    );

    // Risk adjustment factors cho từng scenario
    const riskFactors = {
      1: 0.95, // Scenario 1: Low risk, high confidence
      2: 0.85, // Scenario 2: Medium risk
      3: 0.75, // Scenario 3: Depends on price execution
      4: 0.6, // Scenario 4: High risk due to timing
      5: 0.8, // Scenario 5: Medium-high risk
    };

    const riskFactor = riskFactors[scenarioId] || 0.7;

    return baseProfit * riskFactor * confidence;
  }

  /**
   * Kiểm tra funding rates có trái dấu không
   */
  private static isOppositeSign(rate1: number, rate2: number): boolean {
    return (rate1 > 0 && rate2 < 0) || (rate1 < 0 && rate2 > 0);
  }

  /**
   * Format profit percentage cho display
   */
  static formatProfitPercentage(profit: number): string {
    return `${(profit * 100).toFixed(4)}%`;
  }

  /**
   * Tính potential USD profit với position size
   */
  static calculateUSDProfit(
    profitPercentage: number,
    positionSize: number,
  ): number {
    return profitPercentage * positionSize;
  }
}
