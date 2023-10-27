import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// function to display page where user will have compressed file(s) returned to them to download
function ZippedIt() {
  const { name, uploadTime } = useParams();
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log("zipped it page: name = ", name);
  console.log(uploadTime);

  const fetchZippedFiles = async () => {
    try {
      const response = await fetch("http://localhost:3001/users/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, uploadTime: uploadTime }),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error("Error");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchZippedFiles()
      .then((response) => console.log(response))
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
    //.then(setDownloadLinks(response));
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <p style={{ fontSize: "larger" }}>
        Your compressed files are available to download below.
      </p>
      {/* <div>
        {downloadLinks.map((link, index) => (
          <div key={index}>
            <a
              href={`data:application/octet-stream;base64,${link.fileContent}`}
              download={link.fileName}
            >
              {link.fileName}
            </a>
          </div>
        ))}
      </div> */}
      <br />
      <p style={{ fontSize: "larger" }}>
        Click the "Home" link at the top of the screen to compress more files.
      </p>
    </div>
  );
}

export default ZippedIt;
