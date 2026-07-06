#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cstdio>
#include <cerrno>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/ip.h>

#include "helpers.cpp"

constexpr size_t k_max_msg = 4096;
constexpr size_t header_space = 4;

static void msg(const char *msg) {
    fprintf(stderr, "%s\n", msg);
}

static void die(const char *msg) {
    const int err = errno;
    fprintf(stderr, "[%d] %s\n", err, msg);
    abort();
}

static int32_t query(const int fd, const char *text)
{
    auto len = static_cast<uint32_t>(strlen(text));
    if (len > k_max_msg)
    {
        msg("Your client message is too long");
        return -1;
    }

    char wbuf[header_space + k_max_msg];
    mempcpy(wbuf, &len, header_space);
    mempcpy(&wbuf[header_space], text, len);

    if (const int32_t err = Helper::write_all(fd, wbuf, header_space + len)) {
        return err;
    }

    char rbuf[header_space + k_max_msg];
    errno = 0;
    int32_t err = Helper::read_full(fd, rbuf, header_space);
    if (err) {
        msg(errno == 0 ? "EOF" : "read() error");
        return err;
    }
    memcpy(&len, rbuf, header_space);
    if (len > k_max_msg) {
        msg("too long");
        return -1;
    }
    //Did the server sent us a response ? He should have
    err = Helper::read_full(fd, &rbuf[header_space], len);
    if (err) {
        msg("read() error");
        return err;
    }

    printf("server says: %.*s\n", len, &rbuf[header_space]);
    return 0;
}

int main() {
    const int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        die("socket()");
    }

    sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_port = ntohs(1234);
    addr.sin_addr.s_addr = ntohl(INADDR_LOOPBACK);  // 127.0.0.1
    if (connect(fd, reinterpret_cast<const sockaddr*>(&addr), sizeof(addr))) {
        die("connect");
    }

    // constexpr char msg[] = "hello";
    // write(fd, msg, strlen(msg));

    int32_t err = query(fd, "hello1");
    if (err) {
        goto L_DONE;
    }
    err = query(fd, "hello2");
    if (err) {
        goto L_DONE;
    }
    L_DONE:
        close(fd);
    return 0;
}
