import { useState } from "react";


export default function Uploader(){
    const [name,setName] = useState("");

    const handleSubmit = () => {
        console.log(`Uploaded files for ${name}!`)
    }

    return (
        <form id="fileUploadForm" action={handleSubmit()}>
          <input type="text" name="firstName" onSubmit={setName} />
          Files: <input type="file" name="upload" multiple />
         <input type="submit" id="btn"/>
      </form>
    )

}
