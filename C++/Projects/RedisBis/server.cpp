#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cstdio>
#include <cerrno>
#include <iostream>
#include <unistd.h>
#include <vector>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/ip.h>
#include <poll.h>

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

struct Conn
{
    int fd = -1;
    bool want_read = false; // readiness API
    bool want_write = false; // readiness API
    bool want_close = false; // destroy
    std::vector<uint8_t> b_incoming; // buffer data parsed
    std::vector<uint8_t> b_outgoing; //buffer response
};

struct Pollfd {
    int   fd;
    short events;  // incoming events
    short revents; // outgoing events
};

static void fd_set_nb(int fd) {
    fcntl(fd, F_SETFL, fcntl(fd, F_GETFL, 0) | O_NONBLOCK);
}

static Conn *handle_accept(int fd) {
    // accept
    struct sockaddr_in client_addr = {};
    socklen_t addrlen = sizeof(client_addr);
    int connfd = accept(fd, (struct sockaddr *)&client_addr, &addrlen);
    if (connfd < 0) {
        return NULL;
    }
    // set the new connection fd to nonblocking mode
    fd_set_nb(connfd);
    // create a `struct Conn`
    Conn *conn = new Conn();
    conn->fd = connfd;
    conn->want_read = true; // read the 1st request
    return conn;
}

int poll(struct Pollfd *fds, nfds_t nfds, int timeout);

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

    std::vector<Conn *> fd2conn;
    std::vector<Pollfd> poll_args;

    while (true)
    {
        poll_args.clear();
        struct Pollfd pfd = {fd, POLLIN, 0};
        poll_args.push_back(pfd);
        for (Conn *conn : fd2conn) {
            if (!conn) {
                continue;
            }
            struct Pollfd pfd = {conn->fd, POLLERR, 0};
            // poll() flags from the application's intent
            if (conn->want_read) {
                pfd.events |= POLLIN;
            }
            if (conn->want_write) {
                pfd.events |= POLLOUT;
            }
            poll_args.push_back(pfd);
        }
        int rv = poll(poll_args.data(), (nfds_t)poll_args.size(), -1);
        if (rv < 0 && errno == EINTR) {
            continue;   // not an error
        }
        if (rv < 0) {
            die("poll");
        }

        if (poll_args[0].revents) {
            if (Conn *conn = handle_accept(fd)) {
                // put it into the map
                if (fd2conn.size() <= (size_t)conn->fd) {
                    fd2conn.resize(conn->fd + 1);
                }
                fd2conn[conn->fd] = conn;
            }
        }

        // // accept
        // struct sockaddr_in client_addr = {};
        // socklen_t addrlen = sizeof(client_addr);
        // int connfd = accept(fd, (struct sockaddr*)&client_addr, &addrlen);
        // if (connfd < 0)
        // {
        //     continue; // error
        // }
        //
        // while (true)
        // {
        //     int32_t err = one_request(connfd);
        //     if (err)
        //     {
        //         break;
        //     }
        // }

        // do_something(connfd);
        close(connfd);
    }

    return 0;
}
