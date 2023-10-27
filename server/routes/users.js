var express = require("express");
var router = express.Router();

// aws variables / setup
const AWS = require("aws-sdk");
require("dotenv").config();

// file transfer
const multer = require("multer");
const storage = multer.memoryStorage();

// file compression
const AdmZip = require("adm-zip");
const fs = require("fs");

// configure aws sdk
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

const sqs = new AWS.SQS({ region: "ap-southeast-2" });

// const queueName = 'ZipIt.fifo';

// const params = {
//   QueueNamePrefix: queueName,
// };

// const createQueueIfNotExists = async (queueName, params) => {
//   try {
//     const data = await sqs.listQueues(params).promise();

//     if (data.QueueUrls && data.QueueUrls.length > 0) {
//       console.log(`SQS FIFO queue "${queueName}" already exists.`);
//       return data.QueueUrls[0]; // Return the existing queue URL
//     } else {
//       const createParams = {
//         QueueName: queueName,
//         Attributes: {
//           FifoQueue: 'true',
//         },
//       };

//       const createData = await sqs.createQueue(createParams).promise();
//       console.log('SQS FIFO queue created:', createData.QueueUrl);
//       return createData.QueueUrl; // Return the newly created queue URL
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     return null; // Return null if an error occurs
//   }
// };

// (async () => {
//   const queueUrl = await createQueueIfNotExists(queueName, params);

//   if (queueUrl) {
//     // You can now use the queueUrl constant in your application
//     console.log('Queue URL:', queueUrl);
//   }
// })();

const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo";

// function to send a message to the SQS FIFO queue
const sendMessageToQueue = async (messageBody) => {
  const params = {
    MessageBody: messageBody,
    QueueUrl: queueUrl,
    MessageGroupId: "file-compression",
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
  const name = req.body.name;
  const time = req.body.uploadTime;
  const uploadedFiles = req.files;

  if (!uploadedFiles) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const s3UploadPromises = [];
    // const uploadTime = Date.now();
    for (const file of uploadedFiles) {
      const params = {
        Bucket: "zipit-storage",
        Key: `${name}-${time}-${file.originalname}`,
        Body: file.buffer, // uploaded file data
      };
      s3UploadPromises.push(s3.upload(params).promise());
      console.log(`File ${file.originalname} uploaded to s3 bucket`);
    }
    await Promise.all(s3UploadPromises);

    for (const file of uploadedFiles) {
      //const fileName = file.originalname;
      const message = `${name}-${time}-${file.originalname}`;
      await sendMessageToQueue(JSON.stringify({ message }));
      console.log(`File ${file.originalname} added to queue`);
    }

    res
      .status(200)
      .json({ message: `Files uploaded to s3 and queued for processing` });
  } catch (error) {
    console.error("Error uploading files to S3 or queuing:", error);
    res.status(500).json({ error: "Failed to upload files to S3" });
  }
});

// file compression
async function processQueueMessage(message) {
  try {
    const messageBody = JSON.parse(message.Body);
    const fileName = messageBody.message;

    // download the uncompressed file from S3
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    const uncompressedFile = await s3.getObject(params).promise();

    // perform file compression using AdmZip
    const compressedFileData = compressFile(fileName, uncompressedFile.Body);

    // upload the compressed file back to S3
    const compressedFileName = fileName.replace(/\.[^.]+$/, ".zip");

    // upload the compressed file back to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: `zipped/${compressedFileName}`,
      Body: compressedFileData,
    };

    await s3.upload(uploadParams).promise();
    console.log(
      `File ${fileName} compressed and saved as ${compressedFileName} in S3.`
    );

    // delete the processed message from the queue
    await sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      })
      .promise();
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(
        "Specified file to compress in not present in the s3 bucket. Deleting message from queue"
      );
      await sqs
        .deleteMessage({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        })
        .promise();
    } else {
      console.error("Error processing message:", error);
    }
  }
}

function compressFile(fileName, fileData) {
  const zip = new AdmZip();
  zip.addFile(fileName, fileData);
  return zip.toBuffer();
}

async function pollQueue() {
  while (true) {
    const messages = await sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20, // adjusting wait time as needed
      })
      .promise();

    if (messages.Messages && messages.Messages.length > 0) {
      const message = messages.Messages[0];
      await processQueueMessage(message);
    } else {
      console.log("No messages in the queue, continuing to poll for messages");
    }
  }
}

pollQueue();

// return compressed file to front end
router.post("/download", async (req, res) => {
  const name = req.body.name;
  const uploadTime = req.body.uploadTime;
  const numFiles = req.body.numFiles;
  const prefix = `zipped/${name}-${uploadTime}-`;

  // search zipped folder of S3 bucket for file(s)
  const searchParams = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  let receivedFiles = [];

  const checkForFiles = () => {
    return new Promise((resolve, reject) => {
      const poll = () => {
        s3.listObjectsV2(searchParams, (error, data) => {
          if (error) {
            console.error(error);
            reject(error);
            return;
          }

          const fileNames = data.Contents.filter((object) =>
            object.Key.startsWith(prefix)
          ).map((object) => object.Key.replace("zipped/", ""));

          receivedFiles = receivedFiles.concat(fileNames);

          if (receivedFiles.length >= numFiles) {
            const downloadLinks = receivedFiles.map((fileName) => {
              const params = {
                Bucket: bucketName,
                Key: `zipped/${fileName}`,
                Expires: 3600,
              };
              const presignedURL = s3.getSignedUrl("getObject", params);
              console.log("presigned: ", presignedURL);
              return {
                name: fileName,
                link: presignedURL,
              };
              // const link = `https://${bucketName}.s3.amazonaws.com/zipped/${fileName}`;
              // console.log(link);
              // return {
              //   name: fileName,
              //   link: link,
              // };

              // good one:
              //https://zipit-storage.s3.ap-southeast-2.amazonaws.com/zipped/joanna-1698378830614-Credit_Risk_SOAP_2023.zip?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEFoaDmFwLXNvdXRoZWFzdC0yIkgwRgIhALKg7KSGZTuqUl4bfMJ6pRhE%2FkbymqyaXywu0lCugUNAAiEA7uVv1cUTVptaEaKWx23AxFiTqeXtfPaHO%2FRZzHzu3OQqhwQIg%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARADGgw5MDE0NDQyODA5NTMiDB4NdokbCLb6B5jGyirbA1acYucOtHvrA61mSK%2BdQO2SVRD4ZKCpBqfA64CarTC942pGTDPzedSvzy%2BbTTChyvaLjCqmOicupeYzNa4AmB8lHY8rEbr%2B2KzuzEYHi%2FXzQIK858sd%2BHx9KXc2Z05yQjiVZ9lTQIfXbj1W6EV9jT7GXBkwmgmxvnRMXDYSKF94E4IDD3pWKyUjTX7w8EMbo%2Bmcml%2FShupHC9N8tmURTtMhryQ%2BvdUDsR5yJp9Ja2BxZwoaCAwGE%2FMTanUfWv1rV40rclN%2Bapa%2FxrJ2AaZRpPQyiZcpPFdkjWmmylAOmTFxfBAGaDF6TFttsV%2BzZyvSPvvYWRO3ti7YXUTD30CieJlv22zY9qlPZfbg8%2BJkps3YUmyyKgEWHkU2Cp3x0Y6rRH%2Bq%2FA3IN2HJdZcW1JO0R757YAxKQlrlSgeQsGOfZ13nI9kL1HGMzV1H6uVelh3qvcyc8bGlV94HX%2ByCbKPFzcy83N%2FB%2B0wAu9y2ZjahJXAMjYiahwV8mAp0pzCFZrUumy16hgYk8nOFgR0uQ6J9RXnFk8MQ2vMq94jq9Dc%2FNplp%2F8tSnHZdpCCry5oGpa4D59lg3veWQudxi6vWIOezrdFTL6ans6RWGhOEIOb37%2BOXPHbL6qqg%2F6M2uOEwtbnsqQY6kwIwy0XBKxn9BdqmD2YA9wD95tCGlYNjPj9TFGwkTzQHqqGJKcPkCevCSyzRikvjl%2B21UpS3mZ0t6WUv7j%2BwYS9Mtp0MPEm5OJxsu6UVAfpbIofehbdYAHgg4la%2Bx1qTREZU5Gb%2F8yKgh%2BZV%2FF9zfGLf4uZhZTFJRu63KnjNnxABYgocMI1mbJfb2wzMeQ7KhNtkl33nJnKqmoz4JlgzYCsHlo5n9tAsM%2BuWZrVJD6CTgLI2ph73ucrO3JNqQveEdD%2FhlyQ97igbq3VEyvnfkX7t7UJCMASvVlqYxghiFTp07m2fEpNxtZmJG4mh7rX%2B3Vb%2FDkXPBRu5jmb93L3HuRbV9qJ9L5T1qy9uXXaIDBKfxSMRLw%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20231027T035457Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIA5DYSEEJ4UYFH7ZFH%2F20231027%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Signature=e040cd89e74567ef989159eaa422b27e042a82520eb07434f42192c6b3af7338

              // not good:
              //https://zipit-storage.s3.ap-southeast-2.amazonaws.com//zipped/joanna-1698378830614-Credit_Risk_SOAP_2023.zip?AWSAccessKeyId=ASIA5DYSEEJ4Q5ZQ6GG2&Expires=1698382437&Signature=RJqT5paPjcE07cfuhIsVnGsubbM%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEFoaDmFwLXNvdXRoZWFzdC0yIkYwRAIgWaK8PG0S0K85Ho48UTIb1GuwumTkWTDec7tJeoJEoLcCIB0LhCgXyVcm01XND%2FKFUxEMkCxXtGwotjTEAd9I22TyKq4DCIP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQAxoMOTAxNDQ0MjgwOTUzIgySKh8R6PW8IJPfgNMqggOxh3i2zOS9oXZi9r%2FpiBV5yYNWW%2BnyIz8XQZI4tqZW1wyEoZq%2BG0JjbCJwLqPMYPUfWwVYHCWtsy5UgsNAiWViBLeKfkC1sHXd6Uauoa2%2BgPgW%2BU%2B5iJAD2OxDpUwFBG80ggUPoqQ1MdKPoudp4tbByp9JmKldDE612oaO5O1pb0nHyRP42namkh7GPWIhfIVfmuV76wU1%2BtGzv4l%2BxbggOThdZEYdbRpD8QLGaHy%2FyTstACGgS584zeqdEPt9KITgXKQWhZQcJ6lFnjoCy53IezJJj6h9Vb6Na4kK6bBkKZhmAZB%2BuuCVtqxBAVUPJ8PnEkdIaHCUc8WgiYb73p4rHcnEdcg0Evl8C98O2gvKO2psNV5bb8GKuWWJmMmYqfCA1UtCM1WA1OE0cIyUTk53z3hbzU%2Bw6fgDXpn%2BuvjTWtezzj66NrT68v9i%2B8vK05ZOdLLoVAT7TuvMlxrlE%2FTpHYyjwmmlOoXyruQMyGnrM1MG3%2Fzq6hgqkGk0UP12ria4eTCLsuypBjqnActumHf4RzOMrd%2B%2BTtuecmHcCH16bA57pvPbJS6iug21pifEABkY%2Bm0hlBzYqXHsoqCpdcHNE7lO2NZxKySR50CyL%2Be1H%2Fe7LvRHhjH%2BgNY0iYllmAt%2FclmpBcGieI8BOiWPnGO95XbrMnLNsYCF6XtNLT2%2FTkloSV7W8xiGgrVuhg3NKSYkK13hhY0lzUfOvnUbMi6gscwoj%2Bfy0fSsu8Kmhem4qyt5
            });
            resolve(downloadLinks);
          } else {
            setTimeout(poll, 5000);
          }
        });
      };
      poll();
    });
  };

  checkForFiles()
    .then((downloadLinks) => {
      res.json(downloadLinks);
    })
    .catch((error) => {
      console.error("Error during file retrieval", error);
      res.status(500).json({ error: "File retrieval failed" });
    });
});

module.exports = router;
