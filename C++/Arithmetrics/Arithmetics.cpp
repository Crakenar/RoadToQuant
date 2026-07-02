#include <cstdint>
#include <iostream>
#include <cstdint>
#include <iostream>
#include <utility>
bool approximatelyEqualRel(double a, double b, double relEpsilon)
{
    return (std::abs(a - b) <= (std::max(std::abs(a), std::abs(b)) * relEpsilon));
}

int main()
{
    // for (int i = 0; i < 3; i++)
    //     std::cout << i;
    // for (int i = 0; i < 3; ++i)
    //     std::cout << i;

    int x = 6, y = 3;
    // std::cout << x+++++y;

    int x2{ 1 };
    int y2{ 2 };

    std::cout << (++x2, ++y2) << '\n';

    int x3{ 1 };
    int y3{ 2 };

    ++x3;
    std::cout << ++y3 << '\n';

    std::cout << std::boolalpha << approximatelyEqualRel(1, 1.0000001, 0.0001) << std::endl;


    // std::cout << std::boolalpha;
    // std::cout << 256 << "\tin uint8_t:\t" << std::in_range<uint8_t>(256) << '\n';
    // std::cout << 256 << "\tin long:\t" << std::in_range<long>(256) << '\n';
    // std::cout << -1 << "\tin uint8_t:\t" << std::in_range<unsigned>(-1) << '\n';
}