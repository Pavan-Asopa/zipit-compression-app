import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Uploader = () => {
  const [name, setName] = useState('');
  const [numFiles, setNumFiles] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const formRef = useRef(null);

  let navigate= useNavigate();

  const handleInputChange = (event) => {
    setName(event.target.value);
    console.log(`Name is: ${event.target.value}`);
  };

  const handleFileChange = (event) => {
    setNumFiles(event.target.value);
    console.log(`Will compress ${event.target.value} files`);
  };

  const clearForm = () => {
    setName('');
    setNumFiles(0);
    setNumFiles([]);
      // Reset the form
  formRef.current.reset();
    console.log("Cleared the form");
  }

  const handleFileSelect = (event) => {
    const files = event.target.files;
    setSelectedFiles(files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // Create a FormData object to send files to the backend
      const formData = new FormData();
      formData.append('name', name);
      formData.append('numFiles', numFiles);

      // Append selected files to the FormData object
      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      // Make a POST request to your backend
      const response = await fetch('http://localhost:3001/users/uploadToS3', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Files uploaded to S3 successfully.');
        clearForm();
        navigate('/zippedIt')
      } else {
        console.error('Error uploading files to S3:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error uploading files to S3:', error);
    }
  };

  return (
    <div className="form-container">
      <form id="fileUploadForm" ref={formRef} onSubmit={handleSubmit}>
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
          Upload to S3
        </button>
      </form>
    </div>
  );
};

export default Uploader;


