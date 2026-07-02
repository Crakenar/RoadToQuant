#include <bitset>
#include <cstdint>
#include <iostream>
#include <limits>
#include <bit>

int main()
{

    std::bitset<8> bits{ 0b0000'0101 }; // we need 8 bits, start with bit pattern 0000 0101
    bits.set(3);   // set bit position 3 to 1 (now we have 0000 1101)
    bits.flip(4);  // flip bit 4 (now we have 0001 1101)
    bits.reset(4); // set bit 4 back to 0 (now we have 0000 1101)

    std::cout << "All the bits: " << bits<< '\n';
    std::cout << sizeof(bits);
    std::cout << "Bit 3 has value: " << bits.test(3) << '\n';
    std::cout << "Bit 4 has value: " << bits.test(4) << '\n';

    std::bitset<4> bitsetsManual { 0b1100 };

    std::cout << bitsetsManual << '\n';
    std::cout << (bitsetsManual >> 1) << '\n'; // shift right by 1, yielding 0110
    std::cout << (bitsetsManual << 1) << '\n'; // shift left by 1, yielding 1000

    std::bitset<4> b4{ 0b100 }; // b4 is 0100
    std::bitset<8> b8{ 0b100 }; // b8 is 0000 0100

    std::cout << "Initial values:\n";
    std::cout << "Bits: " << b4 << ' ' << b8 << '\n';
    std::cout << "Values: " << b4.to_ulong() << ' ' << b8.to_ulong() << "\n\n";

    b4 = ~b4; // flip b4 to 1011
    b8 = ~b8; // flip b8 to 1111 1011

    std::cout << "After bitwise NOT:\n";
    std::cout << "Bits: " << b4 << ' ' << b8 << '\n';
    std::cout << "Values: " << b4.to_ulong() << ' ' << b8.to_ulong() << '\n';

    std::cout << (std::bitset<4>{ 0b0101 } | std::bitset<4>{ 0b0110 }) << '\n';

    uint64_t val = 0;

    for (int i = 0; i < std::numeric_limits<uint64_t>::digits; i++)
    {
        // std::cout << i << std::endl;
        std::cout << (1u << i) << std::endl;
        val |= (1u << i);
    }

    std::cout << val << std::endl;

    // float f = 23.45f;
    // auto i = std::bit_cast<int>(f);
    //
    // std::cout << "Integer representation of the float is: " << i << '\n';
}
