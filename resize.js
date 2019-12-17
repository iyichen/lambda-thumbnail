'use strict';

const http = require('http');
const https = require('https');
const querystring = require('querystring');

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

exports.handler = (event, context, callback) => {
  let response = event.Records[0].cf.response;

  // console.log("response:" + JSON.stringify(response));

  //check if image is not present
  if (response.status == 403) {

    let request = event.Records[0].cf.request;

    // console.log("request:" + JSON.stringify(request));

    let bucket;

    let host = request.origin.s3.domainName;
    let bucketIndex = host.indexOf('.s3.amazonaws.com');
    if (bucketIndex > 0) {
        bucket = host.substring(0, bucketIndex);
        // console.log("bucket:" + bucket);
    } else {
        callback(null, response);
        return;
    }


    // read the required path. Ex: uri /thumbnails/200x200/gamely/1/def1.png
    let path = request.uri;

    // Ex: path variable /thumbnails/200x200/gamely/1/def1.png
    let key = path.substring(1); // thumbnails/200x200/gamely/1/def1.png

    // parse the prefix, width, height and image name
    let originalKey, match, width, height, requiredFormat, imageKey;
    let startIndex;

    match = key.match(/(.*)\/(\d+)x(\d+)\/((.*)\.(.*))/);

    if (match == null || match.length != 7) {
      callback(null, response);
      return;
    }

    try {

      width = parseInt(match[2], 10);
      height = parseInt(match[3], 10);

      imageKey = match[4];
      // correction for jpg required for 'Sharp'
      requiredFormat = match[6].toLowerCase();
      requiredFormat = (requiredFormat == "jpg" ? "jpeg" : (requiredFormat == "gif" ? "png" : requiredFormat));
      
      originalKey = imageKey;

      // console.log("args:" + originalKey + ". " + width + ". " + height + ". " + requiredFormat + ". " + imageKey);
    }
    catch (err) {
      console.log("parse error. path:" + path);
      callback(null, response);
      return;
    }

    // get the source image file
    S3.getObject({ Bucket: bucket, Key: originalKey }).promise()
      // perform the resize operation
      .then(data => Sharp(data.Body)
        .resize(width, height)
        .toFormat(requiredFormat)
        .toBuffer()
      )
      .then(buffer => {
        // save the resized object to S3 bucket with appropriate object key.
        S3.putObject({
            Body: buffer,
            Bucket: bucket,
            ContentType: 'image/' + requiredFormat,
            CacheControl: 'max-age=2592000',
            Key: key,
            StorageClass: 'STANDARD'
        }).promise()
        // even if there is exception in saving the object we send back the generated
        // image back to viewer below
        .catch(() => { 
          console.log("Exception while writing resized image to bucket. path:" + path);
          callback(null, response);
          return;
        });

        // generate a binary response with resized image
        response.status = 200;
        response.body = buffer.toString('base64');
        response.bodyEncoding = 'base64';
        response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/' + requiredFormat }];
        response.headers['last-modified'] = [{ key: 'Last-Modified', value: new Date().toUTCString() }];
        callback(null, response);
      })
    .catch( err => {
      console.log("Exception while reading source image. path:" + path);
      callback(null, response);
      return;
    });
  } // end of if block checking response statusCode
  else {
    // allow the response to pass through
    callback(null, response);
  }
};