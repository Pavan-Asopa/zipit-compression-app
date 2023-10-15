import { useState } from "react";

export default function Uploader() {
  const [name, setName] = useState("");
  const [numFiles, setNumFiles] = useState(0);

  const handleInputChange = (event) => {
    setName(event.target.value);
    console.log(`Name is: ${event.target.value}`);
  };

  const handleFileChange = (event) => {
    setNumFiles(event.target.value);
    console.log(`Will compress ${event.target.value} files`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(`Uploaded ${numFiles} files for ${name}!`);
  };

  return (
    <div className="form-container">
      <form id="fileUploadForm" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firstName" style={{ fontSize: "larger" }}>
            Name to be associated with job{" "}
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
          >
            <option value="0">0</option>
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
          />
        </div>
        <button type="submit" className="submit-button">
          ZipIt!
        </button>
      </form>
    </div>
  );
}
