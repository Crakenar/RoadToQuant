# Design Patterns

## Philosophy

Design patterns are reusable solutions to common software design problems. They are not code -- they are templates. Overusing them is as dangerous as not using them. The test: *does this pattern reduce complexity and coupling, or does it add ceremony?*

The Gang of Four (GoF) book classifies 23 patterns into three families: **Creational**, **Structural**, and **Behavioral**. In C++ quant development, C++-specific idioms (CRTP, PIMPL, copy-and-swap) and quant-specific patterns (LMAX Disruptor, lock-free queues) are equally important.

---

## Creational Patterns

### Singleton

Ensures a class has exactly one instance.

**C++ (Meyers Singleton -- thread-safe since C++11):**
```cpp
class Logger {
public:
    static Logger& get() {
        static Logger instance;  // C++11: init once, thread-safe
        return instance;
    }
    void log(const std::string& msg) { std::cout << msg << "\n"; }
private:
    Logger() = default;
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
};
// Usage: Logger::get().log("Order filled");
```

**Python:**
```python
# Idiomatic: use a module
# config.py -- this IS a singleton
MAX_POSITION = 1000
RISK_LIMIT = 50000.0

# Or with __new__:
class Config:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

**When to use:** Logging, configuration, connection pools. **Avoid** when you want testability -- prefer dependency injection.

---

### Factory Method

Define a method for creating objects; let subclasses decide the concrete type.

**C++:**
```cpp
struct Order { virtual ~Order() = default; virtual void execute() = 0; };
struct MarketOrder : Order { void execute() override { /* immediate fill */ } };
struct LimitOrder  : Order { void execute() override { /* add to book */ } };

struct OrderFactory {
    virtual std::unique_ptr<Order> create() = 0;
};
struct MarketOrderFactory : OrderFactory {
    std::unique_ptr<Order> create() override {
        return std::make_unique<MarketOrder>();
    }
};
```

**Python:**
```python
class Order:
    @classmethod
    def market(cls, symbol, qty): return MarketOrder(symbol, qty)
    @classmethod
    def limit(cls, symbol, qty, price): return LimitOrder(symbol, qty, price)
```

---

### Abstract Factory

Create families of related objects without specifying concrete classes.

**C++ (venue-compatible trading components):**
```cpp
struct VenueFactory {
    virtual std::unique_ptr<IFeed>   createFeed()   = 0;
    virtual std::unique_ptr<IRouter> createRouter() = 0;
};
struct CMEFactory : VenueFactory {
    std::unique_ptr<IFeed>   createFeed()   override { return std::make_unique<CMEFeed>(); }
    std::unique_ptr<IRouter> createRouter() override { return std::make_unique<CMERouter>(); }
};
```

---

### Builder

Construct complex objects step by step.

**C++ (Named Parameter Idiom):**
```cpp
class OrderBuilder {
    std::string symbol_; int qty_; double price_; bool ioc_ = false;
public:
    OrderBuilder& symbol(std::string s) { symbol_ = s; return *this; }
    OrderBuilder& qty(int q)            { qty_ = q;    return *this; }
    OrderBuilder& price(double p)       { price_ = p;  return *this; }
    OrderBuilder& ioc()                 { ioc_ = true; return *this; }
    Order build() { return Order{symbol_, qty_, price_, ioc_}; }
};
// auto order = OrderBuilder().symbol("AAPL").qty(100).price(150.5).ioc().build();
```

**Python:**
```python
class OrderBuilder:
    def __init__(self): self._d = {}
    def symbol(self, s):  self._d['symbol'] = s;  return self
    def qty(self, q):     self._d['qty'] = q;      return self
    def price(self, p):   self._d['price'] = p;    return self
    def build(self):      return Order(**self._d)

order = OrderBuilder().symbol('AAPL').qty(100).price(150.5).build()
```

---

### Prototype

Clone existing objects instead of reconstructing from scratch.

**C++:**
```cpp
struct Instrument {
    virtual ~Instrument() = default;
    virtual std::unique_ptr<Instrument> clone() const = 0;
    std::string symbol; double tickSize;
};
struct Equity : Instrument {
    std::unique_ptr<Instrument> clone() const override {
        return std::make_unique<Equity>(*this);
    }
};
```

**Python:**
```python
import copy
template = RiskModel(vol=0.2, correlation_matrix=big_matrix)
strategy1_model = copy.deepcopy(template)
strategy2_model = copy.deepcopy(template)
```

---

## Structural Patterns

### Adapter

Make an incompatible interface compatible.

**C++:**
```cpp
struct IOrderHandler { virtual void onOrder(const Order&) = 0; };
struct LegacyFIXHandler {
    void handleFIXMessage(const std::string& fix) { /* ... */ }
};
struct FIXAdapter : IOrderHandler {
    LegacyFIXHandler legacy_;
    void onOrder(const Order& o) override {
        legacy_.handleFIXMessage(o.toFIX());
    }
};
```

**Python:**
```python
class FeedAdapter:  # Implements our IFeed protocol
    def __init__(self, third_party_feed):
        self._feed = third_party_feed
    def subscribe(self, symbol, callback):
        data = self._feed.get_quote(symbol)  # incompatible interface
        callback(data)
```

---

### Decorator

Add behavior to objects dynamically without subclassing.

**C++ (compile-time, zero-overhead):**
```cpp
template<class T>
struct LoggingOrder : T {
    void execute() {
        std::cout << "Executing...\n";
        T::execute();
        std::cout << "Done.\n";
    }
};
// LoggingOrder<RiskCheckedOrder<MarketOrder>> order;
```

**Python:**
```python
import functools, time

def timer(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {(time.perf_counter()-t0)*1e6:.1f}us")
        return result
    return wrapper

@timer
def price_option(S, K, T, r, sigma): ...
```

---

### Facade

Simplify a complex subsystem behind one clean interface.

**C++:**
```cpp
class TradingFacade {
    RiskEngine risk_; OrderRouter router_;
    MarketDataFeed feed_; AuditLogger audit_;
public:
    bool placeOrder(const std::string& sym, int qty, double price) {
        if (!risk_.check(sym, qty, price)) return false;
        audit_.log("Placing", sym, qty, price);
        router_.send(Order{sym, qty, price});
        return true;
    }
};
```

**Python:**
```python
class BacktestFacade:
    def __init__(self):
        self._data = MarketDataLoader()
        self._engine = BacktestEngine()
        self._reporter = PerformanceReporter()

    def run(self, strategy, start, end):
        bars = self._data.load(start, end)
        results = self._engine.run(strategy, bars)
        return self._reporter.generate(results)
```

---

### Flyweight

Share immutable (intrinsic) state; store mutable (extrinsic) state externally.

**C++ (instrument pool for 1M positions):**
```cpp
struct Instrument { std::string symbol; double tickSize; int lotSize; };
struct InstrumentPool {
    static const Instrument& get(const std::string& sym) {
        static std::unordered_map<std::string, Instrument> pool;
        return pool.at(sym);
    }
};
struct Position {
    const Instrument* instrument;  // shared, not copied
    double qty, avgPrice;           // per-position state
};
```

**Python:**
```python
class InstrumentPool:
    _pool = {}
    @classmethod
    def get(cls, symbol):
        if symbol not in cls._pool:
            cls._pool[symbol] = Instrument(symbol)
        return cls._pool[symbol]

# Python string interning is a built-in Flyweight:
# a = 100; b = 100; assert a is b  # True
```

---

### Proxy

Control access to another object (lazy init, caching, access control).

**C++ (virtual proxy):**
```cpp
struct MarketDataProxy : IMarketData {
    mutable std::unique_ptr<RealMarketData> real_;
    double getPrice(const std::string& sym) override {
        if (!real_) real_ = std::make_unique<RealMarketData>();
        return real_->getPrice(sym);
    }
};
```

**Python (caching proxy):**
```python
class CachingFeed:
    def __init__(self, real_feed):
        self._feed = real_feed
        self._cache = {}
    def __getattr__(self, name):  # transparent forwarding
        return getattr(self._feed, name)
    def get_price(self, symbol):
        if symbol not in self._cache:
            self._cache[symbol] = self._feed.get_price(symbol)
        return self._cache[symbol]
```

---

## Behavioral Patterns

### Observer

One-to-many dependency: when Subject changes, all Observers are notified.

**C++:**
```cpp
struct IObserver { virtual void onTick(double price) = 0; };
struct PriceFeed {
    std::vector<IObserver*> obs_;
    void subscribe(IObserver* o) { obs_.push_back(o); }
    void publish(double price) {
        for (auto* o : obs_) o->onTick(price);
    }
};
```

**Python:**
```python
class PriceFeed:
    def __init__(self): self._handlers = []
    def subscribe(self, fn): self._handlers.append(fn)
    def publish(self, price):
        for fn in self._handlers: fn(price)

feed = PriceFeed()
feed.subscribe(lambda p: strategy_a.on_tick(p))
feed.subscribe(lambda p: strategy_b.on_tick(p))
```

---

### Strategy

Define a family of algorithms, encapsulate each, make them interchangeable.

**C++ (compile-time via templates -- zero overhead):**
```cpp
template<class ExecPolicy>
class OrderExecutor { ExecPolicy policy_;
public:
    void execute(const Order& o) { policy_.execute(o); }
};
struct TWAPPolicy { void execute(const Order& o) { /* TWAP */ } };
OrderExecutor<TWAPPolicy> exec;
```

**Python (functions as strategies):**
```python
def twap(order, bars): ...
def vwap(order, bars): ...

class Executor:
    def __init__(self, strategy): self._strategy = strategy
    def execute(self, order, bars): return self._strategy(order, bars)

exec = Executor(twap)  # swap strategy at runtime
```

---

### Command

Encapsulate a request as an object -- enables undo, queuing, logging.

**C++:**
```cpp
struct ICommand { virtual void execute() = 0; virtual void undo() = 0; };
struct BuyCommand : ICommand {
    OrderBook& book_; Order order_;
    void execute() override { book_.add(order_); }
    void undo()    override { book_.cancel(order_.id); }
};
std::vector<std::unique_ptr<ICommand>> history;
```

---

### State

Change behavior based on internal state transitions.

**Python (regime-switching strategy):**
```python
class TrendingState:
    def generate_signal(self, bars): return momentum_signal(bars)
    def check_transition(self, bars, ctx):
        if not is_trending(bars): ctx.state = MeanRevertingState()

class MeanRevertingState:
    def generate_signal(self, bars): return mean_revert_signal(bars)
    def check_transition(self, bars, ctx):
        if is_trending(bars): ctx.state = TrendingState()

class AdaptiveStrategy:
    def __init__(self): self.state = TrendingState()
    def on_bar(self, bars):
        signal = self.state.generate_signal(bars)
        self.state.check_transition(bars, self)
        return signal
```

---

### Null Object

Do-nothing implementation that eliminates null checks.

**C++:**
```cpp
struct ILogger { virtual void log(const std::string&) = 0; };
struct ConsoleLogger : ILogger { void log(const std::string& m) override { std::cout << m; } };
struct NullLogger    : ILogger { void log(const std::string&)   override {} }; // no-op
void run(ILogger& log) { log.log("starting"); } // no null check needed
```

**Python:**
```python
class NullLogger:
    def log(self, msg): pass
    def error(self, msg): pass

def run_strategy(logger=None):
    logger = logger or NullLogger()
    logger.log('Starting')  # always safe
```

---

## C++ Idioms

### CRTP -- Curiously Recurring Template Pattern

Static polymorphism with zero virtual dispatch overhead.

```cpp
template<class Derived>
class StrategyBase {
public:
    void on_bar(const Bar& b) {
        static_cast<Derived*>(this)->generate_signal(b);  // inlined, zero cost
    }
};
class MomentumStrategy : public StrategyBase<MomentumStrategy> {
public:
    void generate_signal(const Bar& b) { /* runs at full speed */ }
};
```

Used in: Eigen expression templates, `std::enable_shared_from_this`, policy mixins.

---

### PIMPL -- Pointer to Implementation

Compilation firewall: hide implementation details in .cpp, reduce build times.

```cpp
// order.h -- no internal includes needed
class Order {
public:
    Order(const std::string& sym, int qty);
    ~Order();
    void execute();
private:
    struct Impl;
    std::unique_ptr<Impl> pImpl_;
};

// order.cpp
struct Order::Impl {
    std::string symbol; int qty;
    RiskEngine risk;  // heavy header only here
};
```

**Cost:** +1 heap allocation, +1 pointer dereference. Avoid in latency-critical hot paths.

---

### Copy-and-Swap

Exception-safe, self-assignment-safe assignment operator.

```cpp
class Matrix {
    double* data_; size_t rows_, cols_;
public:
    // ... copy ctor, destructor ...
    friend void swap(Matrix& a, Matrix& b) noexcept {
        using std::swap;
        swap(a.data_, b.data_);
        swap(a.rows_, b.rows_);
        swap(a.cols_, b.cols_);
    }
    Matrix& operator=(Matrix other) {  // pass by value: copy/move already done
        swap(*this, other);             // swap with temp -- noexcept
        return *this;
    }
};
```

---

### LMAX Disruptor

Lock-free ring buffer for inter-thread communication at nanosecond latency.

```cpp
constexpr int64_t RING_SIZE = 1024;   // power of two!
constexpr int64_t MASK = RING_SIZE - 1;

struct alignas(64) Slot {             // one slot per cache line
    MarketData data;
    std::atomic<int64_t> sequence{-1};
};

struct Disruptor {
    Slot ring[RING_SIZE];
    alignas(64) std::atomic<int64_t> writeSeq{-1};
    alignas(64) std::atomic<int64_t> readSeq{-1};

    void publish(const MarketData& d) {
        int64_t seq = writeSeq.fetch_add(1) + 1;
        ring[seq & MASK].data = d;   // bitwise AND, not modulo
        ring[seq & MASK].sequence.store(seq, std::memory_order_release);
    }
};
```

**Key ideas:** power-of-2 size (bitwise AND vs modulo), cache-line padding (no false sharing), `memory_order_release/acquire` (correct visibility without full barriers).

---

## Quick Reference

| Pattern | Intent | C++ Idiom | Python Idiom |
|---|---|---|---|
| Singleton | One global instance | Meyers static local | Module-level |
| Factory | Decouple creation | make_unique + virtual | @classmethod |
| Builder | Complex construction | Method chaining | Method chaining |
| Adapter | Interface bridge | Object composition | Wrapper class |
| Decorator | Add behavior | Template wrapping | @functools.wraps |
| Flyweight | Share immutable state | Const ref pool | __slots__ + dict |
| Proxy | Controlled access | Smart pointers | __getattr__ |
| Observer | Event notification | Callback vector | List of callables |
| Strategy | Swap algorithms | Templates / std::function | Callables |
| Command | Request as object | std::function queue | Class + execute() |
| State | State-dependent behavior | Virtual state class | State object |
| CRTP | Static polymorphism | class D : Base<D> | ABCs + duck typing |
| PIMPL | Compilation firewall | unique_ptr<Impl> | N/A (use modules) |
| Disruptor | Lock-free IPC | Ring buffer + atomics | C extension |
