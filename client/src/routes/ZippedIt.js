import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { LuDownload } from "react-icons/lu";
import RiseLoader from "react-spinners/RiseLoader";
import { fetchConfig } from "../utils/fetchConfig";

// function to display page where user will have compressed file(s) returned to them to download
function ZippedIt() {
  // grab passed parameters of user's name, upload time, and number of files
  const { name, uploadTime, numFiles } = useParams();

  // constants for download links, loading, and errors
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect() to fetch zipped files from the server
  useEffect(() => {
    const fetchZippedFiles = async () => {
      // call fetchConfig() to get backend URL
      const backendURL = await fetchConfig();
      try {
        // post request to /return route, which will search for and return compressed files
        const response = await fetch(`${backendURL}/return`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name, // server will use user's name and upload time to search for associated files
            uploadTime: uploadTime,
            numFiles: numFiles, // server will use number of files to make sure to return the number the user is expecting
          }),
        });

        // check whether response is successful
        if (response.ok) {
          const data = await response.json();
          setDownloadLinks(data);
        } else {
          // check for errors
          setError("Server returned error");
        }
      } catch (error) {
        // catch any other errors
        setError("Error while fetching");
      } finally {
        setLoading(false);
      }
    };

    fetchZippedFiles();
  }, [name, uploadTime, numFiles]);

  // display message when loading (during file compression)
  if (loading) {
    return (
      <div>
        <p
          style={{
            fontSize: "larger",
            color: "#0392FF",
            marginTop: "40px",
            marginBottom: "40px",
          }}
        >
          Compressing your files...
        </p>
        <RiseLoader
          color="#FF9C50"
          loading={loading}
          margin={10}
          aria-label="loading icon"
          data-testid="loader"
        />
      </div>
    );
  }

  // display error if server returns an error
  if (error) {
    return (
      <p style={{ fontSize: "larger", marginTop: "40px" }}>
        Error compressing files: {error}
      </p>
    );
  }

  return (
    <div>
      <p
        style={{ fontSize: "larger", marginTop: "40px", marginBottom: "40px" }}
      >
        Your compressed files are available to download below:
      </p>
      <div>
        {downloadLinks.map((link, index) => (
          <div key={index}>
            <Link to={link.link}>
              <button className="download-button">
                <div className="button-contents">
                  <LuDownload
                    color="#000000"
                    size={25}
                    style={{ paddingRight: "5px" }}
                  />
                  Download file: {link.name.split("-").slice(2).join("-")}{" "}
                </div>
              </button>
            </Link>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "larger", marginTop: "30px" }}>
        Click the "Home" link at the top of the screen to compress more files.
      </p>
    </div>
  );
}

export default ZippedIt;
