var express = require('express');
var router = express.Router();
const AWS = require('aws-sdk');

// Create unique bucket name
const bucketName = "";
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

(async () => {
  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    // We will ignore 409 errors which indicate that the bucket already exists
    if (err.statusCode !== 409) {
      console.log(`Error creating bucket: ${err}`);
    }
  }
})();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Endpoint to get pre-signed URLs for file uploads
router.post('/getPresignedUrls', (req, res) => {
  const { numFiles } = req.body; // Number of files to upload

  if (!numFiles) {
    return res.status(400).json({ error: 'Please specify the number of files to upload' });
  }

  const preSignedUrls = [];

  // Generate pre-signed URLs for each file
  for (let i = 0; i < numFiles; i++) {
    const params = {
      Bucket: 'YOUR_BUCKET_NAME',
      Key: `uploads/${Date.now()}-file${i}`, // set the key
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
