import "../App.css";
import Uploader from "../components/Uploader";

export default function Home() {
  return (
    <div>
      <p style={{ fontSize: "larger" }}>
        Fill out the form below to compress your files. Once the job is
        complete, your compressed files will be available to download.
      </p>
      <br />
      <Uploader />
    </div>
  );
}
