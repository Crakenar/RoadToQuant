# Quant Dev 250

## C++ for Quant Development

### RAII and Resource Management

```cpp
// RAII: tie resource lifetime to scope
class MarketDataConnection {
    int fd;
public:
    MarketDataConnection(const char* host) : fd(connect(host)) {}
    ~MarketDataConnection() { if (fd >= 0) close(fd); }  // always released
};
```

### Modern C++ Essentials

**Rule of Five**: if you define destructor, copy ctor, copy assignment, move ctor, or move assignment -- define all five.

**Move semantics**: avoid expensive copies by transferring ownership.
```cpp
std::vector<Order> orders = buildOrders();
process(std::move(orders));  // zero-copy transfer; orders is now in valid-but-unspecified state
```

**CRTP -- zero-cost static polymorphism**:
```cpp
template<typename Derived>
struct OrderBase {
    void send() { static_cast<Derived*>(this)->sendImpl(); }  // no vtable
};
struct LimitOrder : OrderBase<LimitOrder> {
    void sendImpl() { /* ... */ }
};
```

**Fixed-point prices (avoid floating-point errors)**:
```cpp
// 1 tick = 0.01 cents; store as int64
int64_t price_ticks = 1234500;  // = $123.45
int64_t sum = price_ticks + other_price_ticks;  // exact integer arithmetic
```

**Cache-friendly layout (SoA for SIMD)**:
```cpp
// AoS (cache-unfriendly for vectorized price updates)
struct Order { double price; int qty; int id; };
std::vector<Order> orders;

// SoA (cache-friendly: process all prices in a tight loop)
struct OrderBook { std::vector<double> prices; std::vector<int> qtys; std::vector<int> ids; };
```

**string_view for zero-copy parsing**:
```cpp
void parseField(std::string_view msg) {  // no allocation
    auto tag_end = msg.find('=');
    auto tag = msg.substr(0, tag_end);
    auto val = msg.substr(tag_end + 1);
}
```

**constexpr lookup tables (zero runtime cost)**:
```cpp
constexpr auto buildTickTable() {
    std::array<double, 1000> t{};
    for (int i = 0; i < 1000; ++i) t[i] = i * 0.01;
    return t;
}
constexpr auto TICK_TABLE = buildTickTable();  // computed at compile time
```

## Quantitative Mathematics

### Probability Fundamentals

**Expected value**: E[X] = sum(x * P(X=x)). Linearity: E[aX+bY] = aE[X]+bE[Y] always.

**Variance**: Var(X) = E[X^2] - E[X]^2. Std dev = sqrt(Var(X)).

**Covariance**: Cov(X,Y) = E[(X-muX)(Y-muY)].
Correlation = Cov(X,Y) / (sigma_X * sigma_Y), always in [-1, 1].

**Bayes' Theorem**: P(A|B) = P(B|A) * P(A) / P(B).

**Central Limit Theorem**: sum of N i.i.d. variables converges to Normal as N -> inf.
sqrt(N) * (X_bar - mu) / sigma -> N(0,1).

### Stochastic Calculus

**Brownian motion** W_t: continuous paths, W_0 = 0, increments W_t - W_s ~ N(0, t-s).
Key property: quadratic variation dW_t^2 = dt (not zero, unlike ordinary calculus).

**Geometric Brownian Motion (GBM)** for stock prices:
dS = mu*S*dt + sigma*S*dW
Solution: S_t = S_0 * exp((mu - sigma^2/2)*t + sigma*W_t)
This ensures S_t > 0 always; log returns are normally distributed.

**Ito's Lemma** (stochastic chain rule):
For f(t, X_t): df = (df/dt + mu*df/dX + 0.5*sigma^2 * d^2f/dX^2)dt + sigma*df/dX * dW
The extra 0.5*sigma^2*f_XX term (from dW^2=dt) is absent in ordinary calculus.

### Options Pricing

**Black-Scholes assumptions**: GBM, constant sigma, no dividends, no transaction costs,
continuous trading, constant risk-free rate r.

**Black-Scholes European Call**:
C = S*N(d1) - K*e^(-rT)*N(d2)
d1 = [ln(S/K) + (r + sigma^2/2)*T] / (sigma*sqrt(T))
d2 = d1 - sigma*sqrt(T)
Put-call parity: P = C - S + K*e^(-rT)

**The Greeks**:
| Greek | Formula | Meaning |
|-------|---------|---------|
| Delta | dC/dS | Hedge ratio (shares to hold per option) |
| Gamma | d^2C/dS^2 | Rate of delta change; rehedging frequency |
| Vega | dC/dsigma | Sensitivity to 1% vol change |
| Theta | dC/dt | Time decay (usually negative for long options) |
| Rho | dC/dr | Sensitivity to interest rate |

**Implied volatility**: back-solved sigma that makes B-S equal observed market price.
**Vol smile/skew**: IV varies by strike -- OTM puts have higher IV (crash protection demand).
Black-Scholes assumes flat vol; reality has smile/skew.

### Risk Metrics

**Sharpe Ratio** = (R_p - R_f) / sigma_p
Risk-adjusted return. Annualized Sharpe > 1 is good; > 2 is excellent.

**Maximum Drawdown** = max peak-to-trough decline. Measures tail risk better than std dev for systematic strategies.

**VaR (Value at Risk)**: loss not exceeded with probability (1-alpha).
99% 1-day VaR = loss exceeded only 1% of trading days.

**CVaR / Expected Shortfall**: E[Loss | Loss > VaR].
Captures tail severity. Subadditive (VaR is not). Required by Basel III.

**Kelly Criterion**: f* = (p*b - q) / b, where b=odds, p=P(win), q=1-p.
Maximizes long-run geometric growth. Use fractional Kelly (0.25-0.5f*) in practice.

### Factor Models

**PCA on covariance matrix**: extracts orthogonal factors by explained variance.
Yield curve: 3 PCs explain ~99% (level, slope, curvature).

**CAPM**: E[R_i] = R_f + beta_i * (E[R_m] - R_f)
Beta measures systematic (market) risk; alpha is excess return above CAPM prediction.

**Fama-French 3-factor**: adds size (SMB) and value (HML) factors to CAPM.

## Trading Systems

### System Architecture

**Order flow**: Strategy -> OMS -> EMS -> Exchange -> Confirmation -> OMS -> Strategy

**OMS (Order Management System)**: lifecycle management, position tracking, pre-trade risk checks, reconciliation.

**EMS (Execution Management System)**: smart order routing, algos (TWAP/VWAP), venue selection, fill tracking.

### Market Microstructure

**Order book**: bids (descending) and asks (ascending). Best bid/ask = inside market.
Level 1: top of book only. Level 2: full depth. Level 3: individual orders.

```cpp
// Typical order book representation
std::map<Price, std::deque<Order>, std::greater<Price>> bids;  // best bid first
std::map<Price, std::deque<Order>>                      asks;  // best ask first
```

**Market impact**: large orders move the price adversely. Impact scales as sqrt(Q/V) roughly.

**Adverse selection**: informed traders hit quotes when they have an information advantage.
Market makers earn spread from uninformed flow, lose to informed traders.

**Bid-ask spread**: compensates market makers for inventory risk and adverse selection.

### Execution Algorithms

| Algo | Strategy | Use case |
|------|----------|---------|
| TWAP | Equal slices over time | Predictable volume, simple |
| VWAP | Proportional to historical volume profile | Minimize market impact |
| POV (Participation rate) | Fixed % of market volume | Avoid front-running |
| IS (Implementation Shortfall) | Minimize total cost = market impact + timing risk | Optimal when alpha decays |

### FIX Protocol

Text-based (tag=value) protocol. Nearly universal in institutional trading.
```
8=FIX.4.2|35=D|49=TRADER|56=BROKER|11=ORD001|55=AAPL|54=1|38=100|40=2|44=150.00|10=123|
```
Tag 35=D: New Order Single. Tag 55=Symbol. Tag 38=Quantity. Tag 40=OrderType (2=limit). Tag 44=Price.

Binary alternatives for market data: ITCH (NASDAQ), SBE (CME), FAST. 10-100x throughput.

### Low-Latency Techniques

| Technique | Latency reduction | Mechanism |
|-----------|------------------|-----------|
| Co-location | ms -> us | Physical proximity to exchange |
| Kernel bypass (DPDK/Solarflare) | ~5us -> ~500ns | Skip OS syscalls |
| FPGA | ~500ns -> ~50ns | Hardware-level processing |
| CPU pinning | Jitter reduction | Prevent context switches |
| Huge pages | TLB miss reduction | Larger virtual memory pages |
| Cache line padding | False sharing elimination | Prevent coherence traffic |

### Risk Management in Code

```cpp
// Pre-trade risk check (circuit breaker pattern)
bool submitOrder(const Order& o) {
    if (positionSize + o.qty > maxPosition) { halt(); return false; }
    if (dailyLoss > maxDailyLoss)           { halt(); return false; }
    if (orderRate > maxOrdersPerSecond)     { halt(); return false; }
    return sendToExchange(o);
}
```

### P&L Attribution

Break P&L into:
- Alpha (signal contribution)
- Transaction costs (spread paid, market impact, commissions)
- Factor exposure (unintended beta, sector tilts)
- Residual

Essential for diagnosing whether strategy is working as designed.

## Common Interview Problems

**Two-sum O(N)**: hash map -- for each element, check if (target - x) is in map.

**Sliding window maximum**: deque maintaining max index. O(N).

**Count inversions**: merge sort variant. O(N log N).

**Stock buy/sell (max profit)**: single pass, track min price seen so far. O(N).

**LRU Cache**: unordered_map + doubly-linked list for O(1) get and put.

```cpp
// Two sum -- O(N)
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); ++i) {
        int need = target - nums[i];
        if (seen.count(need)) return {seen[need], i};
        seen[nums[i]] = i;
    }
    return {};
}
```
