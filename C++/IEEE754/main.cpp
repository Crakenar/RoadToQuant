#include <iomanip>
#include <iostream>
#include <limits>
#include <ostream>

template<typename T>
T sum(T arg) {
    return arg;
}

template<typename T, typename ...Args>
T sum(T arg, Args... args) {
    return arg + sum<T>(args...);
}

int main()
{
    std::cout << std::boolalpha; // print bool as true or false rather than 1 or 0
    std::cout << "float: " << std::numeric_limits<float>::is_iec559 << '\n'; //4-byte IEEE 754
    std::cout << "double: " << std::numeric_limits<double>::is_iec559 << '\n'; // 8-byte IEEE 754
    std::cout << "long double: " << std::numeric_limits<long double>::is_iec559 << '\n'; // variable


    std::cout << 5.0 << '\n'; //cout never prints fractional if 0
    std::cout << 6.7f << '\n';
    std::cout << 9876543.21 << '\n';

    //cout truncates floating number at 6 decimals by default

    std::cout << 9.87654321f << '\n';
    std::cout << 987.654321f << '\n';
    std::cout << 987654.321f << '\n';
    std::cout << 9876543.21f << '\n';
    std::cout << 0.0000987654321f << '\n';

    //we can fix this with -> i wonder what is the cost of that precision
    std::cout << std::setprecision(17); // show 17 digits of precision
    std::cout << 3.33333333333333333333333333333333333333f <<'\n';
    std::cout << 3.33333333333333333333333333333333333333 << '\n';

    //sometimes we looose  precision because it cannot be stored precisely, if possible, use double instead of float to avoid rounding error

    std::cout << (std::numeric_limits<double>::max() ==
        (std::numeric_limits<double>::max() - 1));

    unsigned unsignedX = -7;
    int intY = 6;
    std::cout << unsignedX << std::endl;



    auto x = sum(0.5, 2, 0.5, 2);
    auto y = sum(2, 0.5, 2, 0.5);
    std::cout << x << y << std::endl; // No space between the two numbers.


    int z = 4;
    while (z --> 0)
    {
        std::cout << z;
    }
    std::cout << "" << std::endl;
    std::cout << std::numeric_limits<double>::lowest() << std::endl;
    std::cout << std::numeric_limits<double>::epsilon() << std::endl;


    enum class FeePriority {
        One = 0,
        Two,
        Three
    };
    FeePriority priority = FeePriority(3);
    std::cout << (int)priority << std::endl;


    struct X {
        operator void() {
            std::cout << "G" << std::endl;
        }
    };
    X xcast;
    (void)xcast;
    static_cast<void>(xcast);
    xcast.operator void();

    unsigned int c = unsigned int { 5 };
}