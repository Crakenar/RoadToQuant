#pragma once
#include <opencv2/core.hpp>
#include <string>

namespace Helper
{
    cv::Mat readAndOpenImageCustom(const std::string &path);
}