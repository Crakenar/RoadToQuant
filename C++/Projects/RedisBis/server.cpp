#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cstdio>
#include <cerrno>
#include <iostream>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/ip.h>

#include "helpers.cpp"

static void msg(const char* msg)
{
    fprintf(stderr, "%s\n", msg);
}

static void die(const char* msg)
{
    const int err = errno;
    fprintf(stderr, "[%d] %s\n", err, msg);
    abort();
}

static void do_something(int connfd)
{
    char rbuf[64] = {};

    if (const ssize_t n = read(connfd, rbuf, sizeof(rbuf) - 1); n < 0)
    {
        msg("read() error");
        return;
    }
    fprintf(stderr, "client says: %s\n", rbuf);

    char wbuf[] = "world";
    write(connfd, wbuf, strlen(wbuf));
}

constexpr size_t k_max_msg = 4096;
constexpr size_t header_space = 4;

static int32_t one_request(int connfd)
{
    char rbuf[header_space + k_max_msg];
    errno = 0;
    int32_t err = Helper::read_full(connfd, rbuf, header_space);
    if (err)
    {
        msg(errno == 0 ? "EOF" : "read_full read() error");
        return err;
    }
    uint32_t len = 0;
    memcpy(&len, rbuf, header_space);
    if (len > k_max_msg)
    {
        msg("read_full: Message too long");
        return -1;
    }

    err = Helper::read_full(connfd, &rbuf[header_space], len);

    if (err)
    {
        msg("read() error");
        return err;
    }

    printf("Client says: %.*s\n", len, &rbuf[header_space]);

    const char reply[] = "world";
    char wbuf[header_space + sizeof(reply)];
    len = static_cast<uint32_t>(strlen(reply));
    mempcpy(wbuf, &len, header_space);
    mempcpy(&wbuf[header_space], reply, len);
    return Helper::write_all(connfd, wbuf, header_space + len);
}

int main()
{
    const int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0)
    {
        die("socket()");
    }

    // this is needed for most server applications
    int val = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &val, sizeof(val));

    // bind
    struct sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_port = ntohs(1234);
    addr.sin_addr.s_addr = ntohl(0); // wildcard address 0.0.0.0
    int rv = bind(fd, (const struct sockaddr*)&addr, sizeof(addr));
    if (rv)
    {
        die("bind()");
    }

    // listen
    rv = listen(fd, SOMAXCONN);
    if (rv)
    {
        die("listen()");
    }

    while (true)
    {
        // accept
        struct sockaddr_in client_addr = {};
        socklen_t addrlen = sizeof(client_addr);
        int connfd = accept(fd, (struct sockaddr*)&client_addr, &addrlen);
        if (connfd < 0)
        {
            continue; // error
        }

        while (true)
        {
            int32_t err = one_request(connfd);
            if (err)
            {
                break;
            }
        }

        // do_something(connfd);
        close(connfd);
    }

    return 0;
}
