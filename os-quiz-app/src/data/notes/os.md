# Operating Systems Virtualization — Study Notes

> Source: *Operating Systems: Three Easy Pieces* (OSTEP)  
> Based on the getcracked.io OS Virtualization progress tree

---

## Abbreviations & Glossary

### Process & CPU
| Abbrev. | Meaning |
|---------|---------|
| OS | Operating System — manages hardware resources and provides services |
| PCB | Process Control Block — kernel struct storing all process state (registers, PID, state, open files) |
| PID | Process ID — unique integer identifier for a process |
| PC / IP | Program Counter / Instruction Pointer — address of next instruction |
| SP | Stack Pointer — points to top of the stack |
| ISA | Instruction Set Architecture — hardware-visible interface (x86, ARM, RISC-V) |
| LDE | Limited Direct Execution — run process directly on CPU but OS retains control via traps + timer IRQs |
| syscall | System Call — user process requests OS service by triggering a software trap |
| IRQ | Interrupt Request — hardware signal to CPU to handle an event |
| ISR | Interrupt Service Routine — kernel function that handles an interrupt |
| IVT | Interrupt Vector Table — maps interrupt numbers to handler addresses |

### Scheduling
| Abbrev. | Meaning |
|---------|---------|
| FIFO / FCFS | First In First Out / First Come First Served |
| SJF | Shortest Job First — optimal turnaround (non-preemptive) |
| STCF | Shortest Time-to-Completion First — preemptive SJF |
| RR | Round Robin — each job runs for a fixed time slice |
| MLFQ | Multi-Level Feedback Queue — approximates SJF using past behavior |
| CFS | Completely Fair Scheduler — Linux default; red-black tree + vruntime |
| vruntime | Virtual Runtime — CFS measure of CPU time consumed (weighted by niceness) |
| SQMS | Single-Queue Multiprocessor Scheduling — one shared queue for all CPUs |
| MQMS | Multi-Queue Multiprocessor Scheduling — one queue per CPU; work-stealing |

### Memory
| Abbrev. | Meaning |
|---------|---------|
| VA / VPN | Virtual Address / Virtual Page Number — address seen by user-space |
| PA / PFN | Physical Address / Physical Frame Number — actual DRAM address |
| MMU | Memory Management Unit — hardware translating VA→PA on every access |
| TLB | Translation Lookaside Buffer — hardware cache of VA→PA translations |
| ASID | Address Space ID — TLB tag per process (avoids full TLB flush on context switch) |
| PTE | Page Table Entry — maps VPN to PFN + metadata bits |
| PT | Page Table — per-process array of PTEs |
| PDE | Page Directory Entry — top-level entry in a multi-level page table |
| CR3 | Control Register 3 (x86) — holds physical address of page table root |
| COW | Copy-On-Write — share frames between processes; copy only on first write |
| OOM | Out Of Memory — kernel kills processes when memory is exhausted |
| LRU | Least Recently Used — evict the page unused the longest |

### PTE / TLB Bits
| Bit | Meaning |
|-----|---------|
| Valid | Mapping exists and is legal |
| Present | Page is in physical memory (0 → page fault, page is on disk) |
| Dirty | Page has been written; must be flushed to disk before eviction |
| Reference / Accessed | Page was recently accessed; used by clock algorithm |
| Protection | Read / Write / Execute permissions |

---

## THE PROCESS

### The Abstraction: The Process (Ch. 4)
- A **process** = a running program; the OS abstraction of a CPU
- **Address space**: memory the process can address (code, stack, heap)
- **Registers**: PC, SP, general-purpose registers — make up the machine state
- **Process API**: create, destroy, wait, status, control

**How the OS creates a process:**
1. Load code + static data from disk into memory (lazily in modern OS)
2. Allocate stack (with argc/argv) and heap (initially small)
3. Initialize I/O (stdin, stdout, stderr)
4. Jump to entry point (`main()`) → CPU runs the program

---

### The API (Ch. 5)

**`fork()`**
- Creates a child process as a near-exact copy of the parent
- Returns: 0 to child, child's PID to parent, -1 on error
- Child and parent run concurrently after the fork

**`wait()` / `waitpid()`**
- Parent blocks until child terminates
- Cleans up the zombie entry in the process table

**`exec()` family**
- Replaces the calling process's address space with a new program
- Does NOT create a new process — transforms the current one
- On success, never returns (the old code is gone)

**`fork()` + `exec()` pattern:**
```
pid = fork()
if pid == 0:   # child
    exec("newprogram")
else:          # parent
    wait()
```
- Shell uses this to run every command you type

---

### Process States & Data Structures (Ch. 4)

**States:**
- **Running**: currently executing on CPU
- **Ready**: runnable but waiting for CPU
- **Blocked**: waiting for I/O or event (e.g., disk read, sleep)
- *(Zombie)*: finished but not yet reaped by parent

**Transitions:**
- Running → Ready: preempted by scheduler
- Running → Blocked: issued blocking syscall
- Blocked → Ready: I/O completes
- Ready → Running: scheduler picks it

**PCB (Process Control Block):** stores registers, PID, state, memory maps, open file table, scheduling info — everything needed to context-switch.

---

## LIMITED DIRECT EXECUTION

### LDE: The Technique (Ch. 6)

**Goal:** Run processes fast (directly on CPU) while keeping OS in control.

**Restricted operations — two CPU modes:**
- **User mode**: process runs; cannot issue privileged instructions
- **Kernel mode**: OS runs; full hardware access

**System calls via traps:**
1. Process executes `trap` instruction → CPU switches to kernel mode
2. Jumps to pre-registered **trap handler** (address in IVT)
3. OS handles request, then `return-from-trap` → back to user mode
4. Process never directly calls OS code; uses trap numbers only

**Context switch:**
1. Timer interrupt fires
2. CPU switches to kernel mode, runs interrupt handler
3. OS saves current process's registers (to its PCB)
4. OS restores next process's registers (from its PCB)
5. `return-from-trap` → new process runs

---

### Issues with LDE (Ch. 6)

**Problem 1: Restricted operations**
- Solution: system calls + privilege levels

**Problem 2: Switching between processes**
- Early approach: **cooperative** — trust processes to yield (via syscall). Problem: infinite loops never yield.
- Modern approach: **preemptive** — hardware timer fires periodically, OS takes back control regardless

**Context switch cost:**
- Save/restore registers (~ns)
- TLB flush (cache cold) — bigger performance impact
- Modern OS: ~1–10µs per context switch

---

## SCHEDULING: INTRODUCTION

### Workload, Metrics, and Algorithms (Ch. 7)

**Key metrics:**
- **Turnaround time** = completion time − arrival time (performance metric)
- **Response time** = first run time − arrival time (interactivity metric)
- **Fairness** — Jain's fairness index

**Algorithms:**
| Algorithm | Turnaround | Response | Notes |
|-----------|-----------|----------|-------|
| FIFO | Poor if long jobs first | Poor | Simple |
| SJF | Optimal (no preemption) | Poor | Needs job length |
| STCF | Optimal (preemptive) | Poor | Needs job length |
| RR | Poor (stretches jobs) | **Excellent** | Great interactivity |

**The fundamental trade-off:** optimizing turnaround (run to completion) hurts response time, and vice versa.

---

### Incorporating I/O (Ch. 7)

- When a job issues I/O, it **blocks** → CPU is idle if we wait
- **Overlap I/O with CPU:** scheduler runs another job while the first waits for I/O
- Each I/O sub-job can be treated as an independent job → better CPU utilization
- **STCF with overlap** = near-optimal for both turnaround and utilization

---

## SCHEDULING: MLFQ

### Basic Rules and Altering Priority (Ch. 8)

**5 Rules of MLFQ:**
1. If Priority(A) > Priority(B) → A runs
2. If Priority(A) = Priority(B) → A and B run in RR
3. New job enters at **highest priority** queue
4. If a job uses up its time allotment at a level → **demoted** to lower queue
5. After period S → **boost all jobs** to top queue (prevents starvation)

**Why boost?** CPU-bound jobs sink to the bottom and starve without it.

**Gaming prevention:** count total CPU time used at a level (not just per time slice) — issuing I/O just before the slice expires doesn't reset the counter.

**MLFQ intuition:** approximates STCF without knowing job lengths. Interactive jobs (short bursts) stay at top; CPU-bound jobs sink to bottom.

---

### Tuning the MLFQ (Ch. 8)

**Parameters:**
1. **Number of queues** — more = finer granularity (typical: 8–16)
2. **Time slice per queue** — high priority: short (10ms); low priority: long (100ms+)
3. **Boost period S** — how often to reset all jobs to top priority
4. **CPU time accounting** — count total time at a level to prevent gaming

**Real-world:**
- **Solaris**: 60 queues, configurable decay table
- **FreeBSD**: decay formula based on recent CPU usage
- **Linux O(1)** (pre-CFS): similar parameterizable approach

---

## SCHEDULING: MULTIPROCESSOR

### Multiprocessor Architecture (Ch. 10)

**Cache locality:**
- **Temporal locality**: recently accessed data → likely accessed again → keep in cache
- **Spatial locality**: accessed address X → likely access X+1 → cache the whole cache line

**Cache coherence:**
- Problem: multiple CPUs with separate caches can have stale copies of the same memory address
- Solution: **bus snooping** — caches monitor the bus; write-invalidate protocol invalidates other caches' copies on write

**Cache affinity:**
- A process builds warm cache state (TLB entries, cache lines) on a CPU over time
- Rescheduling to a different CPU → cold cache → performance penalty
- Scheduler should prefer running a process on the **same CPU** it last ran on

**Multi-CPU challenges:**
- Shared data structures need locks → contention
- Cache coherence traffic overhead
- Load imbalance vs. cache affinity trade-off

---

### Single and Multi-Queue Scheduling (Ch. 10)

**SQMS (Single-Queue Multiprocessor Scheduling):**
- One global run queue shared by all CPUs
- ✅ Simple
- ❌ Lock contention scales badly with CPU count
- ❌ No cache affinity guarantee

**MQMS (Multi-Queue Multiprocessor Scheduling):**
- Each CPU has its own private queue
- ✅ Scalable (no shared lock)
- ✅ Cache affinity preserved
- ❌ Load imbalance when one CPU is idle

**Load balancing — work stealing:**
- Idle CPU peeks at another CPU's queue and steals jobs
- Trade-off: too frequent = overhead + cache misses; too infrequent = imbalance
- Migrating a job costs: loses warm cache state

---

## ALTERNATIVE AND REAL-WORLD SCHEDULERS

### The Alternative to MLFQ: Lottery / Stride Scheduling (Ch. 9)

- **Lottery scheduling**: each process holds tickets; scheduler draws random ticket; winner runs
  - Proportional-share: give more tickets = more CPU
  - Simple, no starvation if every process has ≥ 1 ticket
- **Stride scheduling**: deterministic version; each process has a stride (∝ 1/tickets) and a pass counter; run process with lowest pass, increment by stride

---

### The Linux Completely Fair Scheduler (Ch. 9)

**Core idea:** track `vruntime` per process; always run the process with the lowest vruntime.

**How jobs are stored:**
- Runnable processes in a **red-black tree** ordered by vruntime
- O(log n) insert/remove; leftmost node (min vruntime) cached for O(1) pick

**Weighting (niceness):**
- `nice` value −20 to +19 (lower = higher priority)
- CFS converts to weights via precomputed table
- `vruntime` increments slower for high-weight processes → they run more often
- Formula: `vruntime_delta = actual_time × (weight_0 / weight_of_process)`

**Target latency:** every runnable process runs at least once per interval (e.g. 48ms ÷ 4 processes = 12ms each)

**Minimum granularity:** floor on time slice to avoid excessive context switches.

**Sleeping processes:** removed from tree; on wake-up, vruntime set to current min (avoids CPU burst catch-up).

---

## THE ADDRESS SPACE

### Sharing Space / The Address Space Layout (Ch. 13)

**Layout (low → high):**
```
[Code / Text]   ← read-only, fixed size
[Heap]          ← grows UP (malloc/new)
[...free...]
[Stack]         ← grows DOWN (function calls)
```

**Goals of virtual memory:**
1. **Transparency** — process unaware of virtualization
2. **Efficiency** — hardware-accelerated (TLB, etc.)
3. **Protection** — isolation between processes and from kernel

---

### A Process' Address Space (Ch. 13)

**Q: Is `printf("%p", ptr)` a virtual or physical address?**
→ **Virtual**. User code never sees physical addresses.

**Q: Can two processes share the same virtual address?**
→ **Yes** — each has an independent virtual address space. Both can have a pointer to `0x1000`; they map to different physical locations.

**Q: Can two processes share the same physical address?**
→ **Yes, deliberately** — shared libraries, `mmap(MAP_SHARED)`, `shmget()`. One physical frame mapped into multiple virtual address spaces.

---

### Address Locations — Stack, Heap, and the C API (Ch. 14)

**Stack:** automatic allocation for local variables and function frames. Grows down. Freed automatically on function return.

**Heap:** dynamic allocation. Grows up.
- `malloc(size)` → returns pointer to allocated memory
- `free(ptr)` → returns memory to allocator
- Common bugs: memory leak (forget `free`), use-after-free, double-free, buffer overflow

**C memory API:**
```c
int *p = malloc(sizeof(int) * 10);  // allocate array of 10 ints
free(p);                             // must free exactly once
```

---

## ADDRESS TRANSLATION

### Virtualizing Memory / The MMU (Ch. 15)

**Q: What hardware unit handles address translation?**
→ **MMU (Memory Management Unit)** — inside the CPU chip.

**Q: What is interposing?**
→ Inserting a transparent layer between requester and resource. Hardware interposes on every memory access: software uses virtual address V, MMU silently translates to physical address P.

**Base + bounds (simplest scheme):**
```
physical = virtual + base
if virtual >= bounds → segfault
```
- OS sets base/bounds registers on each context switch (stored in PCB)

---

### Base and Bounds / Segmentation (Ch. 16)

**Segmentation:** split address space into logical segments (code, heap, stack), each with its own base+bounds pair.

**Advantages over single base+bounds:**
- Segments can be placed independently in physical memory
- Code segment can be shared (marked read-only) across processes

**Out-of-bounds access:** hardware detects `offset ≥ bounds` → raises **segfault (SIGSEGV)**

**Problems with segmentation:**
- **External fragmentation**: gaps between segments in physical memory too small to reuse
- Sparse address spaces waste large allocated segments
- Compaction is expensive

---

## FREE-SPACE MANAGEMENT

### Variable Size Chunks (Ch. 17)

**Free list:** linked list of free memory chunks. Each chunk has a header (size + next pointer) embedded before the returned pointer.

**`malloc(N)`:** find chunk of size ≥ N in free list, split if needed, return pointer.

**`free(ptr)`:** read header to get size, insert chunk back into free list.

**Fragmentation types:**
- **Internal**: wasted space inside an allocated chunk (allocated 16, needed 9 → 7 wasted)
- **External**: free memory exists but in non-contiguous chunks too small for a large request

**Coalescing:** on `free()`, merge adjacent free chunks → prevents growing external fragmentation.

**`sbrk()` / `brk()`:** syscall to extend the heap (move program break upward). `mmap()` used for large allocations.

---

### Chunk Cutting Strategies (Ch. 17)

**Placement policies:**
- **Best Fit**: find smallest chunk that fits → least internal waste, but slow + external fragmentation
- **Worst Fit**: find largest chunk → leaves big remainders, generally poor
- **First Fit**: use first chunk that fits → fast, can fragment start of list
- **Next Fit**: like First Fit but starts where last search ended → spreads fragmentation

**Slab allocator (Linux):** pre-allocates pools of fixed-size objects (e.g., PCBs) — eliminates fragmentation for kernel objects.

---

## PAGING

### Fixed Size Chunks and Page Tables (Ch. 18)

**Paging:** divide virtual address space into fixed-size **pages** (typically 4KB); physical memory into **frames** of the same size.

**Virtual address structure:**
```
[ VPN (Virtual Page Number) | Offset ]
```
- VPN indexes into the page table to get PFN
- Physical address = `PFN × page_size + offset`

**Page table:** array of PTEs indexed by VPN. One page table per process.

**PTE bits:** Valid, Present, Dirty, Reference, Protection, PFN.

**Advantages:**
- No external fragmentation (all chunks same size)
- Simple allocation (any free frame works)

---

### Page Table Limitations: Size and Speed (Ch. 18)

**Speed problem:** every memory access = 2 memory accesses (1 for PT lookup + 1 for data) → **TLB** solves this.

**Size problem:**
- 32-bit address space, 4KB pages → 2²⁰ ≈ 1M entries per process
- At 4 bytes/entry → 4MB per process → huge for many processes
- Solutions: multi-level page tables, inverted page tables

**Multi-level page table:** only allocate PT pages that are actually used → sparse address spaces are cheap.

---

## PAGING: CACHING TRANSLATIONS

### Translation Lookaside Buffer (Ch. 19)

**TLB:** hardware cache of recent VPN→PFN translations, inside the MMU.

**TLB hit:** hardware finds VPN → reads PFN directly. No memory access. Fast.

**TLB miss:**
- **Hardware-managed (x86):** hardware walks page table, loads entry, retries
- **Software-managed (MIPS):** raises trap → OS handler loads entry → return

**Context switch:** TLB must be flushed (or use ASIDs to tag entries by process).

---

### TLB Contents and Limitations (Ch. 19)

**TLB entry format:** `VPN | PFN | Valid | Protection | Dirty | ASID`

**Fully associative:** any VPN can be anywhere; all entries searched in parallel. Typical size: 32–128 entries.

**Valid bit vs Present bit:**
- **Valid (TLB)**: this TLB entry holds a usable mapping
- **Present (PTE)**: the page is in physical memory (0 = swapped out → page fault)

**Context switch options:**
1. **Flush TLB** (set all valid bits = 0) → simple but cold TLB after every switch
2. **ASID tagging** → no flush; hardware matches VPN + ASID together → much faster

**Replacement:** LRU or random. TLB thrashing when working set > TLB size.

---

## PAGING: SMALLER TABLES

### Big Pages (Ch. 20)

**Huge pages / superpages:** use larger page sizes (2MB, 1GB instead of 4KB).
- Fewer TLB entries needed → higher TLB hit rate for large working sets
- Less page table memory
- ❌ Internal fragmentation: if you only need 1MB of a 2MB page, 1MB is wasted
- Linux: **Transparent Huge Pages (THP)** — kernel automatically promotes/demotes huge pages

---

### Hybrid Approach: Pages and Segments (Ch. 20)

**Idea:** use segmentation at the top level (one segment per logical region: code, heap, stack), with a page table per segment.
- Saves space: only allocate PT entries for pages in use within each segment
- Base register → physical address of the segment's page table
- Bounds register → size of the segment's page table

**Problem:** still suffers some external fragmentation; complex to implement.

---

### Shrinking Page Tables: Multi-Level Page Tables (Ch. 20)

**Multi-level page table:** break the page table into pages itself; only keep PT pages that are needed.

**Two-level (x86-32) example:**
```
VA = [ PD Index | PT Index | Offset ]
CR3 → Page Directory → Page Table → PFN
```

**Advantages:**
- Sparse address spaces use very little memory
- Each level of the page table fits in one page

**Cost:** TLB miss now requires 2–4 memory accesses instead of 1.

---

## ESCAPING PAGES: BEYOND RAM

### Swap Space (Ch. 21)

**Swap space:** reserved disk area where the OS stores pages that don't fit in physical memory.
- OS can support address spaces larger than physical RAM
- Disk is ~100,000× slower than RAM → minimize swapping

**Present bit:** 0 → page is in swap; PTE stores the **disk address (swap offset)** instead of PFN.

---

### Page Fault & Page Replacement (Ch. 21–22)

**Page fault flow:**
1. Present bit = 0 → hardware raises page-fault trap
2. OS page-fault handler reads disk location from PTE
3. Issues I/O to load page from swap into a free physical frame
4. Updates PTE: present = 1, PFN = new frame
5. Retries the faulting instruction

**When does eviction start?**
- OS maintains **high / low watermarks** on free frames
- When free frames < low watermark → **page daemon (kswapd)** starts evicting
- Stops when free frames > high watermark

**Dirty page:** modified in memory but not yet written to disk.
- Marked by the **dirty bit** in PTE (set by hardware on write)
- Dirty page must be written to disk before eviction; clean page can just be discarded

**Clock algorithm (Second-Chance):**
- Approximates LRU without tracking full access order
- Circular list of pages; clock hand sweeps:
  1. Reference bit = 1 → clear it, advance (second chance)
  2. Reference bit = 0 → **evict this page**
- Prefer evicting clean pages (no disk write needed)

**Thrashing:** OS spends more time paging than doing useful work. Occurs when working set > physical memory. Solutions: admit fewer processes, kill processes (OOM killer), add RAM.

---

### The Linux Address Space (Ch. 23)

**Why does null pointer access cause a segfault?**
- Virtual address 0 is intentionally **unmapped** (no PTE, or PTE invalid)
- MMU raises protection fault → OS delivers **SIGSEGV**
- Benefit: null dereference crashes loudly rather than silently corrupting memory

**Copy-On-Write (COW):**
- On `fork()`: child and parent share all physical frames, marked **read-only**
- First write by either → protection fault → OS copies **only that page**, marks it writable
- Huge saving: if child calls `exec()` immediately, almost no pages are actually copied

**COW uses:** `fork()`, `mmap(MAP_PRIVATE)`, shared libraries, VM snapshotting.

**Linux 64-bit address space layout:**
```
0x0000000000000000  ← unmapped (null guard)
                     user space: code, data, heap, stack
0x00007FFFFFFFFFFF
--- kernel boundary ---
0xFFFF800000000000  ← kernel space (always mapped, ring 0 only)
0xFFFFFFFFFFFFFFFF
```
- Kernel mapped into every process's address space at high addresses → no TLB flush on syscalls
- Kernel virtual addresses: direct-mapped (`virt = phys + offset`) for simple physical memory management
