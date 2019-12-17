'use strict';

// defines the allowed dimensions, default dimensions 
// dimension is allowed.

const variables = {
    allowedDimension : [ {w:75,h:75}, {w:200,h:200}]
};

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    // fetch the uri of original image
    let fwdUri = request.uri;

    let pathMatchFound = false;
    for (let dimension of variables.allowedDimension) {
        let size = "_" + dimension.w + "x" + dimension.h;
        if (fwdUri.indexOf(size) > 0) {
            pathMatchFound = true;
            break;
        }
    }

    if (!pathMatchFound) {
        callback(null, request);
        return;
    }

    let prefix, imageName, width, height, extension;

    const match = fwdUri.match(/(.*)\/(.*)_(\d+)x(\d+)\.(.*)/);

    try {
        prefix = match[1];
        imageName = match[2];
        width = match[3];
        height = match[4];
        extension = match[5];
    } catch (err) {
        console.log("parse error. path:" + fwdUri);
        callback(null, request);
        return;
    }

    // define variable to be set to true if requested dimension is allowed.
    let matchFound = false;
    for (let dimension of variables.allowedDimension) {
        if(dimension.w == width && dimension.h == height){
            width = dimension.w;
            height = dimension.h;
            matchFound = true;
            break;
        }
    }
    
    if(!matchFound){
        callback(null, request);
        return;
    }

    fwdUri = "/thumbnails/" + width + "x" + height + prefix + "/" + imageName + "." + extension;

    // console.log(fwdUri);
    // final modified url is of format /thumbnails/200x200/images/image.jpg
    request.uri = fwdUri;
    callback(null, request);
};