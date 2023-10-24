import "../App.css";
import UploadForm from "../components/UploadForm";

// function to display app's main home page, including an upload form component
function Home() {
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
      <UploadForm />
    </div>
  );
}

export default Home;
