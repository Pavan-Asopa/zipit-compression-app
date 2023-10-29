import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { LuDownload } from "react-icons/lu";

// function to display page where user will have compressed file(s) returned to them to download
function ZippedIt() {
  const { name, uploadTime, numFiles } = useParams();
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZippedFiles = async () => {
      try {
        const response = await fetch(
          "http://ZipIt-load-balancer-892221555.ap-southeast-2.elb.amazonaws.com:3001/return",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name,
              uploadTime: uploadTime,
              numFiles: numFiles,
            }),
          }
        );
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
    return (
      <p style={{ fontSize: "larger", marginTop: "40px" }}>
        Compressing your files...
      </p>
    );
  }

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
                  Download file: {link.name.split("-").slice(2).join("-")}
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
