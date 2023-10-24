import { useParams } from "react-router-dom";

// function to display page where user will have compressed file(s) returned to them to download
function ZippedIt() {
  const { name, uploadTime } = useParams();
  return (
    <div>
      <p style={{ fontSize: "larger" }}>
        Your compressed files are available to download below.
      </p>
      {/* Compressed file return here */}
      <br />
      <p style={{ fontSize: "larger" }}>
        Click the "Home" link at the top of the screen to compress more files.
      </p>
    </div>
  );
}

export default ZippedIt;
