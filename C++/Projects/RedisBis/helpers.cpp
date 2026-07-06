#include <cassert>
#include <unistd.h>
#include <iostream>
#include <netinet/ip.h>

namespace Helper
{
    static int32_t read_full(int fd, char *bufMessage, size_t n)
    {
        while (n > 0)
        {
            const ssize_t readFromBuffer = read(fd, bufMessage, n);
            // printf(reinterpret_cast<const char*>(static_cast<char>(readFromBuffer)));
            if (readFromBuffer <= 0)
            {
                // printf("End of File nothing more to read from bufMessage received");
                return -1;
            }
            assert(static_cast<size_t>(readFromBuffer) <= n);
            n -= static_cast<size_t>(readFromBuffer);
            bufMessage += readFromBuffer;
        }
        return 0;
    }

    static int32_t write_all(const int fd, const char *buf, size_t n)
    {
        while (n > 0)
        {
            const ssize_t rv = write(fd, buf, n);
            if (rv <= 0)
            {
                return -1;
            }
            assert(static_cast<size_t>(rv) <= n);
            n -= static_cast<size_t>(rv);
            buf += rv;
        }
        return 0;
    }
}
