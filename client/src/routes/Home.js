import "../App.css";
import Uploader from "../components/Uploader";

export default function Home() {
  return (
    <div>
      <p
        style={{ fontSize: "larger", marginTop: "40px", marginBottom: "40px" }}
      >
        Fill out the form below to compress your files.
        <br />
        Once the job is complete, your compressed files will be available to
        download.
      </p>
      <Uploader />
    </div>
  );
}
