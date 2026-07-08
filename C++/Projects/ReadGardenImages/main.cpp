#include "opencv2/imgcodecs.hpp"
#include "opencv2/highgui.hpp"
#include "opencv2/imgproc.hpp"
#include <iostream>
#include "helper.h"

using namespace cv;
using namespace std;

Mat src_gray;
int DEFAULT_THRESH = 150;
RNG rng(12345);
constexpr bool DRAW = false;

void thresh_callback(int, void*);
void generate_histogram(cv::Mat&);

int main(int argc, char** argv)
{
    auto start = std::chrono::high_resolution_clock::now();
    cv::CommandLineParser parser(argc, argv, "{@input | fleur.jpg | input image}");
    cv::Mat src = Helper::readAndOpenImageCustom(parser.get<cv::String>("@input"));

    cvtColor(src, src_gray, COLOR_BGR2GRAY);
    blur(src_gray, src_gray, Size(3, 3));

    if (DRAW)
    {
        const char* source_window = "Source";
        namedWindow(source_window);
        imshow(source_window, src);
    }

    thresh_callback(0, nullptr);

    //Histogram
    // ::generate_histogram(src);


    auto stop = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(stop - start);
    cout << "Time taken: " << duration.count() << " microseconds" << endl;

    // waitKey();
    return 0;
}

void generate_histogram(cv::Mat& src)
{
    cvtColor(src, src, COLOR_RGBA2GRAY);

    Mat dst;
    equalizeHist(src, dst);

    imshow("Source image", src);
    imshow("Equalized Image", dst);
}

void thresh_callback(int, void*)
{
    Mat canny_output;
    Canny(src_gray, canny_output, DEFAULT_THRESH, DEFAULT_THRESH * 2);

    vector<vector<Point>> contours;
    vector<Vec4i> hierarchy;
    findContours(canny_output, contours, hierarchy, RETR_TREE, CHAIN_APPROX_SIMPLE);

    // std::cout << canny_output.size() << std::endl;
    auto contourSize = contours.size();
    std::cout << contourSize << std::endl;
    if (contourSize > 10)
    {
        std::cout << "Plante malade !" << std::endl;
    }
    else
    {
        std::cout << "Tout va bien frere !" << std::endl;
    }

    if (DRAW)
    {
        Mat drawing = Mat::zeros(canny_output.size(), CV_8UC3);
        for (size_t i = 0; i < contours.size(); i++)
        {
            // std::cout << contours[i] << std::endl;
            Scalar color = Scalar(rng.uniform(0, 256), rng.uniform(0, 256), rng.uniform(0, 256));
            drawContours(drawing, contours, static_cast<int>(i), color, 2, LINE_8, hierarchy, 0);
        }

        imshow("Contours", drawing);
    }
}
