import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

// function to display page where user will have compressed file(s) returned to them to download
function ZippedIt() {
  const { name, uploadTime, numFiles } = useParams();
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZippedFiles = async () => {
      try {
        const response = await fetch("http://localhost:3001/users/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name,
            uploadTime: uploadTime,
            numFiles: numFiles,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setDownloadLinks(data);
          console.log(data);
        } else {
          setError("Server returned error");
        }
      } catch (error) {
        setError("Error while fetching");
      } finally {
        setLoading(false);
      }
    };

    fetchZippedFiles();
  }, [name, uploadTime, numFiles]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <p style={{ fontSize: "larger" }}>
        Your compressed files are available to download below.
      </p>
      <div>
        {downloadLinks.map((link, index) => (
          <div key={index}>
            <Link to={link.link}>
              <button>
                Download file: {link.name.split("-").slice(2).join("-")}
              </button>
            </Link>
            {/* <a href={link.link} target="_blank" rel="noopener noreferrer">
              Download file {index + 1}
            </a> */}
          </div>
        ))}
      </div>
      <br />
      <p style={{ fontSize: "larger" }}>
        Click the "Home" link at the top of the screen to compress more files.
      </p>
    </div>
  );
}

export default ZippedIt;
