import { useParams } from "react-router-dom";

export default function ZippedIt() {
  const {name, time} = useParams();
  console.log(name);
  console.log(time);
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
