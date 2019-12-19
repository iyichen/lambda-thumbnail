# lambda@edge-thumbnail
Resizing images with Amazon Cloudfront and Lambda@edge

Code reference from [https://amazonaws-china.com/cn/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/](https://amazonaws-china.com/cn/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/)



### 支持图片格式

| 图片格式   | 是否支持                        |
| ---------- | ------------------------------- |
| png(PNG)   | 是                              |
| jpg(JPG)   | 是                              |
| jpeg(JPEG) | 是                              |
| gif(GIF)   | 是（取第一帧做缩放转为PNG格式） |
| webp       | 是                              |

### 生成规则

**缩略图访问地址为图片名称后添加`宽x高`**

**缩略图存储路径为`thumbnail/{宽}x{高}/{图片原始路径}`**

如原图访问地址为`/images/abc.jpg`

如果需要宽为75且高为75的缩略图，则访问地址为`/images/abc_75x75.jpg`，缩略图存储地址为`thumbnail/75x75/images/abc.jpg`

### request.js

**用于定位图片地址(便于缩略图统一管理)，配置于源请求(origin request)**

定义访问规则。当访问路径满足规则时，转到`S3`指定路径，如访问`/images/abc_75x75.jpg`，实际访问路径为`thumbnail/75x75/images/abc.jpg`

配置`lambda`内存128M

### resize.js

**用于处理图片，配置于源响应(origin response)**

处理缩略图。当源响应返回`403`时，下载原图片并生成缩略图，将缩略图存储在`S3`上，然后返回给`Cloudfront`

配置`lambda`内存192M

### Lambda测试事件

#### request.js

```json
{
  "Records": [
    {
      "cf": {
        "config": {
          "distributionId": "EXAMPLE"
        },
        "request": {
          "uri": "/zmn_200x200.jpg",
          "querystring": "",
          "method": "GET",
          "clientIp": "2001:cdba::3257:9652",
          "headers": {
            "host": [
              {
                "key": "Host",
                "value": "d123.cf.net"
              }
            ],
            "user-agent": [
              {
                "key": "User-Agent",
                "value": "Test Agent"
              }
            ],
            "user-name": [
              {
                "key": "User-Name",
                "value": "aws-cloudfront"
              }
            ]
          }
        }
      }
    }
  ]
}
```



#### resize.js

```json
{
  "Records": [
    {
      "cf": {
        "config": {
          "distributionDomainName": "d123.cloudfront.net",
          "distributionId": "EDFDVBD6EXAMPLE",
          "eventType": "viewer-response",
          "requestId": "xGN7KWpVEmB9Dp7ctcVFQC4E-nrcOcEKS3QyAez--06dV7TEXAMPLE=="
        },
        "request": {
          "clientIp": "69.28.52.250",
          "headers": {
            "x-forwarded-for": [
              {
                "key": "X-Forwarded-For",
                "value": "69.28.52.250"
              }
            ],
            "user-agent": [
              {
                "key": "User-Agent",
                "value": "Amazon CloudFront"
              }
            ],
            "via": [
              {
                "key": "Via",
                "value": "1.1 90fad974d764682d9ebcf5193bde136b.cloudfront.net (CloudFront)"
              }
            ],
            "upgrade-insecure-requests": [
              {
                "key": "upgrade-insecure-requests",
                "value": "1"
              }
            ],
            "sec-fetch-user": [
              {
                "key": "sec-fetch-user",
                "value": "?1"
              }
            ],
            "sec-fetch-site": [
              {
                "key": "sec-fetch-site",
                "value": "none"
              }
            ],
            "sec-fetch-mode": [
              {
                "key": "sec-fetch-mode",
                "value": "navigate"
              }
            ],
            "accept-encoding": [
              {
                "key": "Accept-Encoding",
                "value": "gzip"
              }
            ]
          },
          "method": "GET",
          "origin": {
            "s3": {
              "authMethod": "origin-access-identity",
              "customHeaders": {},
              "domainName": "test.s3.amazonaws.com", // s3
              "path": "",
              "region": "ap-northeast-1"
            }
          },
          "querystring": "",
          "uri": "/thumbnails/200x200/image-demo/abc.jpg"
        },
        "response": {
          "status": "403",
          "statusDescription": "OK",
          "headers": {
            "server": [
              {
                "key": "Server",
                "value": "MyCustomOrigin"
              }
            ],
            "set-cookie": [
              {
                "key": "Set-Cookie",
                "value": "theme=light"
              },
              {
                "key": "Set-Cookie",
                "value": "sessionToken=abc123; Expires=Wed, 09 Jun 2021 10:18:14 GMT"
              }
            ]
          }
        }
      }
    }
  ]
}
```



