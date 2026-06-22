# C++ Concurrency

## Threads and Concurrency Fundamentals

Concurrency = structuring a program to handle multiple tasks (design property).
Parallelism = actually executing tasks simultaneously on multiple cores (runtime property).

### std::thread basics

```cpp
#include <thread>
#include <iostream>

void task(int id) { std::cout << "Thread " << id << "\n"; }

int main() {
    std::thread t(task, 42);   // launch thread
    t.join();                   // wait for completion
}
```

**Critical rule**: a joinable thread destroyed without join()/detach() calls std::terminate().
Use std::jthread (C++20) which joins automatically in its destructor.

```cpp
// RAII thread guard (pre-C++20)
class thread_guard {
    std::thread& t;
public:
    explicit thread_guard(std::thread& t_) : t(t_) {}
    ~thread_guard() { if (t.joinable()) t.join(); }
};
```

Passing arguments: std::thread copies by default. Use std::ref() for references:
```cpp
void fill(std::vector<int>& v) { v.push_back(1); }
std::vector<int> data;
std::thread t(fill, std::ref(data));  // std::ref required
```

Thread-local storage: each thread gets its own copy.
```cpp
thread_local int counter = 0;  // independent per thread
```

## Protecting Shared Data

### std::mutex + std::lock_guard (RAII)

```cpp
#include <mutex>
std::mutex mtx;

void increment(int& counter) {
    std::lock_guard<std::mutex> lock(mtx);  // locked until scope exit
    ++counter;
}
```

### std::unique_lock (flexible locking)

Required for condition_variable::wait(). Supports deferred locking and early unlock.

```cpp
std::unique_lock<std::mutex> lock(mtx, std::defer_lock);
lock.lock();    // lock manually
// ... do work ...
lock.unlock();  // unlock early if needed
```

### std::scoped_lock (C++17) -- deadlock-free multi-mutex locking

```cpp
std::mutex m1, m2;
void transfer() {
    std::scoped_lock lock(m1, m2);  // deadlock-free: order doesn't matter
    // ...
}
```

### std::shared_mutex -- readers-writer lock

```cpp
#include <shared_mutex>
std::shared_mutex rw;

void read()  { std::shared_lock lock(rw); /* multiple readers OK */ }
void write() { std::unique_lock lock(rw); /* exclusive */           }
```

### Avoiding deadlocks

Classic deadlock: thread A locks M1 then M2; thread B locks M2 then M1.
Prevention: always acquire in the same order, or use std::scoped_lock.

Granularity: coarse locks are simple but serialize; fine-grained locks improve concurrency.

## Condition Variables

```cpp
#include <condition_variable>
std::mutex mtx;
std::condition_variable cv;
bool ready = false;

// Producer
{
    std::lock_guard<std::mutex> lock(mtx);
    ready = true;
}
cv.notify_one();

// Consumer -- ALWAYS use predicate to handle spurious wakeups
{
    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, [&]{ return ready; });  // reacquires lock when done
}
```

**Spurious wakeups**: wait() can return without notify. Always use predicate form.
**Lost wakeup**: if notify fires before wait(), signal is missed. Check condition under lock.

## Futures and Promises

### std::async -- easiest way to run a task and get a result

```cpp
#include <future>
auto fut = std::async(std::launch::async, [](int x){ return x*x; }, 10);
int result = fut.get();  // blocks until ready, returns 100
```

### std::promise / std::future -- producer/consumer channel

```cpp
std::promise<int> prom;
std::future<int> fut = prom.get_future();

std::thread t([&prom]{ prom.set_value(42); });
int val = fut.get();  // blocks until set_value is called
t.join();
```

### std::shared_future -- multiple threads read same result

```cpp
std::shared_future<int> sf = fut.share();
// Now multiple threads can call sf.get()
```

### std::packaged_task -- wrap callable for deferred execution

```cpp
std::packaged_task<int(int)> task([](int x){ return x*2; });
auto fut = task.get_future();
std::thread t(std::move(task), 21);
int result = fut.get();  // 42
t.join();
```

## C++20 Synchronization Primitives

### std::latch -- one-shot countdown

```cpp
#include <latch>
std::latch done(5);  // count down from 5

// Each worker calls:
done.count_down();
done.wait();  // blocks until count reaches 0
```

### std::barrier -- reusable phase barrier

```cpp
#include <barrier>
std::barrier bar(4, []{ /* completion function runs each phase */ });

// Each thread in each phase:
bar.arrive_and_wait();  // blocks until all 4 arrive, then resets
```

### std::counting_semaphore -- resource pool

```cpp
#include <semaphore>
std::counting_semaphore<3> sem(3);  // max 3 concurrent

sem.acquire();  // decrements (blocks if 0)
// ... use resource ...
sem.release();  // increments, wakes a waiter
```

## C++ Memory Model

### Memory orderings (from weakest to strongest)

| Ordering | Guarantees |
|----------|-----------|
| relaxed | Atomicity only, no ordering |
| consume | Data-dependent loads only (avoid: compilers promote to acquire) |
| acquire | No subsequent ops reordered before this load |
| release | No preceding ops reordered after this store |
| acq_rel | Both acquire and release on a single RMW |
| seq_cst | Total global ordering (default, strongest) |

### Acquire-release pattern (lock-free publishing)

```cpp
std::atomic<int> data{0};
std::atomic<bool> ready{false};

// Producer thread
data.store(42, std::memory_order_relaxed);
ready.store(true, std::memory_order_release);  // RELEASE: preceding writes visible

// Consumer thread
while (!ready.load(std::memory_order_acquire));  // ACQUIRE: sees all writes before release
int val = data.load(std::memory_order_relaxed);  // safely reads 42
```

### Compare-and-swap (CAS) loop

```cpp
std::atomic<int> counter{0};

void increment() {
    int expected = counter.load(std::memory_order_relaxed);
    while (!counter.compare_exchange_weak(
        expected,           // updated on failure
        expected + 1,       // desired
        std::memory_order_acq_rel,
        std::memory_order_relaxed)) {
        // retry: expected was updated to current value
    }
}
```

compare_exchange_weak: may fail spuriously (use in loops).
compare_exchange_strong: never fails spuriously (use for single-try).

### Atomic types

```cpp
std::atomic<int> x{0};
x.fetch_add(1);         // RMW: returns old value
x.exchange(99);         // unconditional swap, returns old
x.store(5, std::memory_order_release);
int v = x.load(std::memory_order_acquire);
```

std::atomic_flag: always lock-free. test_and_set() / clear() only. Classic spinlock:
```cpp
std::atomic_flag lock = ATOMIC_FLAG_INIT;
while (lock.test_and_set(std::memory_order_acquire));  // spin
// critical section
lock.clear(std::memory_order_release);
```

### False sharing and cache line alignment (C++17)

```cpp
#include <new>
struct alignas(std::hardware_destructive_interference_size) ThreadData {
    int counter;
    // padding fills rest of 64-byte cache line
};
```

## Lock-Free Programming

### ABA problem

Thread reads A, another thread changes A -> B -> A, CAS succeeds but intermediate
state was missed. Solutions: version counters (ABA-tagged pointers), hazard pointers.

### LMAX Disruptor pattern (HFT ring buffer)

```cpp
// Ring buffer slot padded to cache line
struct alignas(64) Slot {
    std::atomic<int64_t> sequence;
    char padding[64 - sizeof(std::atomic<int64_t>)];
    Message data;
};
```

Producers/consumers coordinate via atomic sequence numbers. No locks needed.
10-100x throughput vs. synchronized queue for intra-process messaging.

### Lock-free SPSC queue (single-producer, single-consumer)

```cpp
template<typename T, size_t N>
class SPSCQueue {
    std::array<T, N> buf;
    alignas(64) std::atomic<size_t> head{0};
    alignas(64) std::atomic<size_t> tail{0};  // separate cache lines!

public:
    bool push(T val) {
        size_t t = tail.load(std::memory_order_relaxed);
        if ((t - head.load(std::memory_order_acquire)) == N) return false;
        buf[t % N] = val;
        tail.store(t + 1, std::memory_order_release);
        return true;
    }

    bool pop(T& val) {
        size_t h = head.load(std::memory_order_relaxed);
        if (h == tail.load(std::memory_order_acquire)) return false;
        val = buf[h % N];
        head.store(h + 1, std::memory_order_release);
        return true;
    }
};
```

Acquire-release is sufficient (no seq_cst overhead). Head and tail on separate cache lines to avoid false sharing.

### Memory reclamation

Options when removing nodes from lock-free structures:
- **Hazard pointers**: threads publish which nodes they access; retire only when no hazard pointer exists
- **Epoch-based reclamation (EBR)**: retire nodes, free them after all threads have advanced past the epoch
- **RCU**: readers are free; writers copy-modify-swap, free old after grace period

### Seqlock (fast readers, no blocking for writers)

```cpp
std::atomic<unsigned> seq{0};
Data data;

void write(Data d) {
    seq.fetch_add(1, std::memory_order_release);  // odd = writing
    data = d;
    seq.fetch_add(1, std::memory_order_release);  // even = done
}

Data read() {
    while (true) {
        unsigned s1 = seq.load(std::memory_order_acquire);
        if (s1 & 1) continue;  // writer active
        Data d = data;
        unsigned s2 = seq.load(std::memory_order_acquire);
        if (s1 == s2) return d;  // consistent read
    }
}
```

## Concurrent Design and Performance

### Amdahl's Law

Speedup = 1 / (S + (1-S)/N), where S = serial fraction, N = thread count.
Even 5% serial code caps max speedup at 20x regardless of core count.

### Performance guidelines

1. Minimize shared state -- partition data per thread where possible
2. Use acquire-release instead of seq_cst where proven correct
3. Pad hot thread-local data to cache line size (64 bytes) to prevent false sharing
4. Avoid oversubscription -- keep thread count near hardware_concurrency()
5. Prefer lock-free for nanosecond-critical paths; mutex for microsecond-scale
6. Use work stealing for dynamic load balancing in thread pools

### Debugging tools

- **ThreadSanitizer (TSan)**: compile with -fsanitize=thread. Detects data races at runtime.
- **Helgrind (Valgrind)**: detects lock order violations. No recompilation needed. ~100x slowdown.
- **Clang/GCC -fsanitize=address**: catches memory bugs in concurrent code.

### Thread-safe sometimes (std::vector example)

Concurrent reads are safe. Concurrent reads with any write = undefined behavior.
Const member functions are thread-safe IF they don't modify shared state.
Never assume a class is thread-safe without documentation saying so.
