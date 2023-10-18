// import { useState } from "react";
// import axios from 'axios';

// export default function Uploader() {
//   const [name, setName] = useState("");
//   const [numFiles, setNumFiles] = useState(0);
//   const [fileUrls, setFileUrls] = useState([]);
//   const [selectedFiles, setSelectedFiles] = useState([]);

//   const handleInputChange = (event) => {
//     setName(event.target.value);
//     console.log(`Name is: ${event.target.value}`);
//   };

//   const handleFileChange = (event) => {
//     setNumFiles(event.target.value);
//     console.log(`Will compress ${event.target.value} files`);
//   };

//   const handleFileSelect = (event) => {
//     const files = event.target.files;
//     setSelectedFiles(files);
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     console.log(`Uploaded ${numFiles} files for ${name}!`);
    
//     try {
//       // Make a request to your server to get pre-signed URLs
//       const response = await axios.post('http://localhost:3001/users/getPresignedUrls', {numFiles }, { name });

//       if (response.data.urls) {
//         setFileUrls(response.data.urls);

//         // Upload the selected files to the pre-signed URLs
//         selectedFiles.forEach(async (file, index) => {
//           const preSignedUrl = response.data.urls[index];
//           await uploadFileToS3(file, preSignedUrl);
//         });
//       }
//     } catch (error) {
//       console.error('Error getting pre-signed URLs:', error);
//     }
//   };

//   return (
//     <div className="form-container">
//       <form id="fileUploadForm" onSubmit={handleSubmit}>
//         <div className="form-group">
//           <label htmlFor="firstName" style={{ fontSize: "larger" }}>
//             Name to be associated with job{" "}
//           </label>
//           <input
//             type="text"
//             id="firstName"
//             name="firstName"
//             placeholder="Your Name"
//             value={name}
//             onChange={handleInputChange}
//             style={{ fontSize: "larger" }}
//             required={true}
//           />
//         </div>
//         <div className="form-group">
//           <label htmlFor="selection" style={{ fontSize: "larger" }}>
//             Select the number of files for compression
//           </label>
//           <select
//             id="selection"
//             name="selection"
//             value={numFiles}
//             onChange={handleFileChange}
//             style={{ fontSize: "larger" }}
//             required = {true}
//           >
//             <option value="0">0</option>
//             <option value="1">1</option>
//             <option value="2">2</option>
//             <option value="3">3</option>
//             <option value="4">4</option>
//             <option value="5">5</option>
//           </select>
//         </div>
//         <div className="form-group">
//           <label htmlFor="filesForUpload" style={{ fontSize: "larger" }}>
//             Select files for upload
//           </label>
//           <input
//             type="file"
//             name="filesForUpload"
//             multiple
//             required={true}
//             style={{
//               fontSize: "larger",
//               alignContent: "center",
//             }}
//             onChange={handleFileSelect}
//           />
//         </div>
//         <button type="submit" className="submit-button">
//           ZipIt!
//         </button>
//       </form>
//     </div>
//   );
// }

import React, { useState } from 'react';
import axios from 'axios';

const Uploader = () => {
  const [name, setName] = useState('');
  const [numFiles, setNumFiles] = useState(0);
  const [fileUrls, setFileUrls] = useState([]); // To store pre-signed URLs
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleInputChange = (event) => {
    setName(event.target.value);
    console.log(`Name is: ${event.target.value}`);
  };

  const handleFileChange = (event) => {
    setNumFiles(event.target.value);
    console.log(`Will compress ${event.target.value} files`);
  };

  const handleFileSelect = (event) => {
    const files = event.target.files;
    setSelectedFiles(files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
  
    try {
      // Make a request to your server to get pre-signed URLs
      const getUrl = `http://localhost:3001/users/getPresignedUrls?numFiles=${numFiles}`;
      const response = await fetch(getUrl);
  
      if (response.ok) {
        const data = await response.json();
        if (data.urls) {
          setFileUrls(data.urls);
  
          // Upload the selected files to the pre-signed URLs
          selectedFiles.forEach(async (file, index) => {
            const preSignedUrl = data.urls[index];
            await uploadFileToS3(file, preSignedUrl);
          });
        } else {
          console.error('No pre-signed URLs received from the server.');
        }
      } else {
        console.error('Error getting pre-signed URLs:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error getting pre-signed URLs:', error);
    }
  };
  

  const uploadFileToS3 = async (file, preSignedUrl) => {
    try {
      const response = await fetch(preSignedUrl, {
        method: 'PUT',
        body: file,
      });

      if (response.ok) {
        console.log(`File uploaded successfully to S3.`);
      } else {
        console.error('Failed to upload file to S3.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div className="form-container">
      <form id="fileUploadForm" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firstName" style={{ fontSize: "larger" }}>
            Name to be associated with job
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="Your Name"
            value={name}
            onChange={handleInputChange}
            style={{ fontSize: "larger" }}
            required={true}
          />
        </div>
        <div className="form-group">
          <label htmlFor="selection" style={{ fontSize: "larger" }}>
            Select the number of files for compression
          </label>
          <select
            id="selection"
            name="selection"
            value={numFiles}
            onChange={handleFileChange}
            style={{ fontSize: "larger" }}
            required={true}
          >
            {/* <option value="0">0</option> */}
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="filesForUpload" style={{ fontSize: "larger" }}>
            Select files for upload
          </label>
          <input
            type="file"
            name="filesForUpload"
            multiple
            required={true}
            style={{
              fontSize: "larger",
              alignContent: "center",
            }}
            onChange={handleFileSelect}
          />
        </div>
        <button type="submit" className="submit-button">
          ZipIt!
        </button>
      </form>
    </div>
  );
};

export default Uploader;

