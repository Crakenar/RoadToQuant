#include "opencv2/imgcodecs.hpp"
#include <iostream>

namespace Helper
{
    cv::Mat readAndOpenImageCustom(const std::string &path)
    {
        cv::Mat src = cv::imread(cv::samples::findFile(path));
        if (src.empty())
        {
            std::cout << "Could not open or find the image!\n" << std::endl;
            throw std::runtime_error("Could not open or find the image: " + path);
        }
        return src;
    }
}
