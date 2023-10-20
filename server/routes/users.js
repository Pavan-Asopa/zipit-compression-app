var express = require("express");
var router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const AWS = require("aws-sdk");
require("dotenv").config();

// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

// create a unique bucket name
const bucketName = "zipit-storage";
const s3 = new AWS.S3();
const upload = multer({ storage: storage });


(async () => {
  try {
    // try creating a new bucket
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    // check whether bukcet already exists
    if (err.statusCode === 409) {
      console.log(`Bucket ${bucketName} already exists`);
    } else {
      // print any other errors in creating the bucket
      console.log(`Error creating bucket: ${err}`);
    }
  }
})();

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});



router.post('/uploadToS3', upload.array('files', 5), async (req, res) => {
  const { name, numFiles } = req.body;
  const uploadedFiles = req.files;

  if (!name || !numFiles || !uploadedFiles) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const s3UploadPromises = [];

    for (const file of uploadedFiles) {
      const params = {
        Bucket: 'zipit-storage',
        Key: `uploads/${Date.now()}-${file.originalname}`,
        Body: file.buffer, // Uploaded file data
      };

      s3UploadPromises.push(s3.upload(params).promise());
    }

    await Promise.all(s3UploadPromises);

    res.status(200).json({ message: 'Files uploaded to S3 successfully' });
  } catch (error) {
    console.error('Error uploading files to S3:', error);
    res.status(500).json({ error: 'Failed to upload files to S3' });
  }
});

module.exports = router;
