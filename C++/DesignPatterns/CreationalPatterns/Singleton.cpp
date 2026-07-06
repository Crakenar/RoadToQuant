class Singleton {
public:
    static Singleton* GetInstance() { static Singleton object; return &object; }

    void operator=(const Singleton&) = delete;
    Singleton(const Singleton&) = delete;
    void operator=(Singleton&&) = delete;
    Singleton(Singleton&&) = delete;

private:
    Singleton() = default;
};