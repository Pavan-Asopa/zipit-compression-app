const AWS = require("aws-sdk");
const fs = require("fs");

// AWS S3 bucket info
const bucketName = "zipit-storage";
const s3 = new AWS.S3();

// AWS SQS queue info
const sqs = new AWS.SQS({ region: "ap-southeast-2" });
const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/ZipIt.fifo";

const { spawn } = require("child_process");

// process queue message by finding file in S3, compressing, and uploading compressed to S3
async function processQueueMessage(message) {
  try {
    const messageBody = JSON.parse(message.Body); // parse message body
    const fileName = messageBody.message; // grab filename from message body

    // download the uncompressed file from S3
    const bucketParams = {
      Bucket: bucketName,
      Key: fileName,
    };
    const uncompressedFile = await s3.getObject(bucketParams).promise();

    // save the downloaded file to the temporary local file system
    const localFilePath = `/tmp/${fileName}`;
    fs.writeFileSync(localFilePath, uncompressedFile.Body);

    // perform file compression using 7z with ultra compression
    const compressedFileName = fileName.replace(/\.[^.]+$/, ".7z"); // regex to replace previous file extension with .7z
    await compressFile(localFilePath, compressedFileName); // wait for file compression

    // upload the compressed file back to S3
    const compressedFilePath = `/tmp/${compressedFileName}`;
    const uploadParams = {
      Bucket: bucketName,
      Key: `zipped/${compressedFileName}`,
      Body: fs.createReadStream(compressedFilePath),
    };
    await s3.upload(uploadParams).promise();
    console.log(
      `File ${fileName} compressed and saved as ${compressedFileName} in S3`
    );

    // clean up the temporary local files
    fs.unlinkSync(localFilePath);
    fs.unlinkSync(compressedFilePath);

    // delete the processed message from the queue
    await sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      })
      .promise();
    console.log("Deleted message:", fileName);
  } catch (error) {
    // catch errors
    // if file indicated in message doesn't exist in S3, delete message
    if (error.statusCode === 404) {
      console.log(
        "Specified file to compress is not present in the S3 bucket. Deleting message from the queue"
      );
      await sqs
        .deleteMessage({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        })
        .promise();
    } else {
      // catch other errors
      console.error("Error processing message:", error);
    }
  }
}

// function to compress file
async function compressFile(filePath, compressedFileName) {
  // use the 7z command-line tool with ultra compression to compress the file
  const _7zCommand = `7z a -t7z -mx9 /tmp/${compressedFileName} ${filePath}`;

  const task = spawn(_7zCommand, { shell: true });
  task.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  task.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  return new Promise((resolve, reject) => {
    task.on("close", (code) => {
      if (code === 0) {
        console.log("File successfully compressed");
        resolve(); // resolve promise if successful
      } else {
        console.error(`File compression failed with code ${code}`);
        reject(code); // reject promise if errors
      }
    });
  });
}

// function to poll the SQS queue for available messages, indicating files are available for compression
async function pollQueue() {
  while (true) {
    const messages = await sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10, // adjust the number of messages to process in each batch
      })
      .promise();

    if (messages.Messages && messages.Messages.length > 0) {
      // if available messages, process
      for (const message of messages.Messages) {
        console.log("Processing message:", message.Body);
        await processQueueMessage(message);
      }
    }
  }
}

// continuously poll queue for messages
pollQueue();
