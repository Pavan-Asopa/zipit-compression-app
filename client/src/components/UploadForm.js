import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig } from "../utils/fetchConfig";

// function to create an upload form for the user to complete to compress their file(s)
function UploadForm() {
  const [name, setName] = useState("");
  const [uploadTime, setUploadTime] = useState(null);
  const [numFiles, setNumFiles] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // set reference for form
  const formRef = useRef(null);

  // declare constant to allow for navigation between app pages
  let navigate = useNavigate();

  // function to set name when user enters text in name box
  const handleNameInputChange = (event) => {
    setName(event.target.value);
  };

  // function to set selected files to those selected by the user
  const handleFileSelect = (event) => {
    const files = event.target.files;
    const maxFiles = 20; // max allowed files

    if (files.length <= maxFiles) {
      // clear previous selections before updating selected files
      setSelectedFiles([]);

      // update selected files and upload time
      setSelectedFiles(Array.from(files));
      setNumFiles(files.length);
      setUploadTime(Date.now());
    } else {
      alert(`You can only select up to ${maxFiles} files`); // display alert if selected files exceed max
      event.target.value = null;
    }
  };

  // function to clear upload form upon submission
  const clearForm = () => {
    setName("");
    setUploadTime(null);
    setNumFiles(0);
    setSelectedFiles([]);

    // reset the form (applies to file input field)
    formRef.current.reset();
  };

  // function to handle submission of the upload form
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // create a formData object to send files to the backend
      const formData = new FormData();

      // append user's name and upload time to the form data to easily identify it
      formData.append("name", name);
      formData.append("uploadTime", uploadTime);

      // append selected files to the formData object
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      // call fetchConfig() to get backend URL
      const backendURL = await fetchConfig();

      // make a post request to the backend to upload files to S3 bucket
      const response = await fetch(`${backendURL}/uploadAndQueue`, {
        method: "POST",
        body: formData,
      });

      // check whether response is successful
      if (response.ok) {
        setLoading(false);
        clearForm(); // clear form upon submission

        // navigate to page where user will receive compressed files for download, passing necessary parameters
        navigate(`/zippedIt/${name}/${uploadTime}/${numFiles}`);
      } else {
        // check for errors
        setError(
          "Error uploading files for compression: ",
          response.statusText
        );
      }
    } catch (error) {
      setLoading(false);
      // catch any other errors
      setError("Error uploading files for compression: ", error);
    }
  };

  // display error if server returns an error
  if (error) {
    return (
      <p style={{ fontSize: "larger", marginTop: "40px" }}>
        Something unexpected happened. The server may be down.
      </p>
    );
  }

  return (
    <div>
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
                Select up to 20 files for upload
              </label>
              <input
                type="file"
                name="filesForUpload"
                multiple
                onChange={handleFileSelect}
                style={{
                  fontSize: "larger",
                }}
                required={true}
              />
            </div>
            <button type="submit" className="submit-button">
              ZipIt
            </button>
          </form>
        </div>
      </div>
      {loading && ( // display loading message when files are being uploaded
        <p style={{ fontSize: "larger", color: "#0392FF" }}>
          Your files are being uploaded. Please do not navigate away from this
          page or edit the form any further.
          <br />
          Thanks for your patience!
        </p>
      )}
    </div>
  );
}

export default UploadForm;
