var express = require('express');
var router = express.Router();
require('dotenv').config();
const AWS = require('aws-sdk');


// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: 'ap-southeast-2',
});

// Create unique bucket name
const bucketName = "zipit-storage";
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

(async () => {
  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    if(err.statusCode === 409){
      console.log(`Bucket ${bucketName} already exists`);
    }else{
    // We will ignore 409 errors which indicate that the bucket already exists
      console.log(`Error creating bucket: ${err}`);
    }
  }
})();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Endpoint to get pre-signed URLs for file uploads using a GET request
router.get('/getPresignedUrls', (req, res) => {
  const { numFiles } = req.query; // Number of files to upload

  if (!numFiles) {
    return res.status(400).json({ error: 'Please specify the number of files to upload' });
  }

  const preSignedUrls = [];

  // Generate pre-signed URLs for each file
  for (let i = 0; i < numFiles; i++) {
    const params = {
      Bucket: 'zipit-storage',
      Key: `uploads/${Date.now()}-file${i}`, // Set the key
      Expires: 600, // URL expiration time in seconds
    };

    s3.getSignedUrl('putObject', params, (error, url) => {
      if (error) {
        console.error('Error generating pre-signed URL:', error);
        return res.status(500).json({ error: 'Failed to generate pre-signed URL' });
      }
      preSignedUrls.push(url);

      // If all URLs have been generated, return them to the client
      if (preSignedUrls.length === numFiles) {
        res.json({ urls: preSignedUrls });
      }
    });
  }
});


module.exports = router;
