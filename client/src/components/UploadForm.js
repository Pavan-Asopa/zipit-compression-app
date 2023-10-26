import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// function to create an upload form for the user to complete to compress their file(s)
function UploadForm() {
  // set states for name, number of files, and selected files
  const [name, setName] = useState("");
  const [numFiles, setNumFiles] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadTime, setUploadTime] = useState(null);

  // set reference for form
  const formRef = useRef(null);

  // declare constant to allow for navigation between app pages
  let navigate = useNavigate();

  // function to set name when user enters text in name box
  const handleNameInputChange = (event) => {
    setName(event.target.value);
  };

  // function to set number of files when user selects a number
  const handleNumFileChange = (event) => {
    setNumFiles(event.target.value);
  };

  // function to set selected files to those selected by the user
  const handleFileSelect = (event) => {
    const files = event.target.files;
    const selectedFilesArray = Array.from(files);
    if (selectedFilesArray.length > 5) {
      // check length of selected file array
      alert("You can only select a maximum of 5 files"); // display alert if user selects > 5 files
      event.target.value = null;
    } else {
      // set selected files and upload time
      setSelectedFiles(files);
      setUploadTime(Date.now()); // upload time based on time files are selected
    }
  };

  // function to clear upload form upon submission
  const clearForm = () => {
    // clear states
    setName("");
    setNumFiles(1);
    setNumFiles([]);

    // reset the form (applies to file input field)
    formRef.current.reset();
    console.log("Upload form successfully cleared");
  };

  // function to handle submission of the upload form
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // create a formData object to send files to the backend
      const formData = new FormData();

      // append user's name, number of files, and upload time to the form data to easily identify it
      formData.append("name", name);
      formData.append("numFiles", numFiles);
      formData.append("uploadTime", uploadTime);

      // append selected files to the formData object
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      // make a post request to the backend to upload files to S3 bucket
      const response = await fetch("http://localhost:3001/users/uploadToS3", {
        method: "POST",
        body: formData,
      });

      // check whether response is successful
      if (response.ok) {
        console.log("Files uploaded to S3 successfully.");
        clearForm(); // clear form upon submission

        // navigate to page where user will receive compressed files for download, passing necessary paramaters
        navigate(`/zippedIt/${name}/${uploadTime}`);
      } else {
        // check for errors
        console.error(
          "Error uploading files for compression: ",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      // catch any other errors
      console.error("Error uploading files for compression: ", error);
    }
  };

  return (
    <div className="form">
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
              onChange={handleNameInputChange}
              style={{ fontSize: "larger" }}
              required={true}
            />
          </div>
          <div className="form-group">
            <label htmlFor="filesForUpload" style={{ fontSize: "larger" }}>
              Select up to 5 files for upload
            </label>
            <input
              type="file"
              name="filesForUpload"
              multiple
              onChange={handleFileSelect}
              style={{
                fontSize: "larger",
                alignContent: "center",
              }}
              required={true}
            />
          </div>
          <button type="submit" className="submit-button">
            ZipIt!
          </button>
        </form>
      </div>
    </div>
  );
}

export default UploadForm;
