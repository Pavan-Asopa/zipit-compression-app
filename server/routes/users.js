var express = require("express");
var router = express.Router();
const AWS = require("aws-sdk");
require("dotenv").config();
const multer = require("multer");
const storage = multer.memoryStorage();
const sqs = new AWS.SQS({ region: 'ap-southeast-2' });

// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

const queueUrl = 'https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo';

// Function to send a message to the SQS FIFO queue
const sendMessageToQueue = async (messageBody) => {
  const params = {
    MessageBody: messageBody,
    QueueUrl: queueUrl,
    MessageGroupId: 'file-compression', // Group messages if needed
  };

  return sqs.sendMessage(params).promise();
};

// create a unique bucket
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// create multer upload object
const upload = multer({ storage: storage });

(async () => {
  try {
    // try creating a new bucket
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    // check whether bucket already exists
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
  res.send("Respond with a resource");
});

router.post("/uploadToS3", upload.array("files", 5), async (req, res) => {
  // const name = req.name;
  // const numFiles = req.numFiles;
  const uploadedFiles = req.files;

  if (!uploadedFiles) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const s3UploadPromises = [];
    for (const file of uploadedFiles) {
      const params = {
        Bucket: "zipit-storage",
        Key: `uploads/${Date.now()}-${file.originalname}`,
        Body: file.buffer, // uploaded file data
      };
      s3UploadPromises.push(s3.upload(params).promise());
      console.log(`File ${file.originalname} uploaded to s3 bucket`);
    }
    await Promise.all(s3UploadPromises);

   for (const file of uploadedFiles){
    const fileName = file.originalname;
    await sendMessageToQueue(JSON.stringify({ fileName}));
    console.log(`File ${fileName} added to queue`);
   }

   res.status(200).json({ message: `Files uploaded to s3 and queued for processing` });
  } catch (error) {
    console.error("Error uploading files to S3 or queuing:", error);
    res.status(500).json({ error: "Failed to upload files to S3" });
  }
});

module.exports = router;
