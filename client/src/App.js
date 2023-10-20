import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GiZipper } from "react-icons/gi";

import Home from "./routes/Home";
import ZippedIt from "./routes/ZippedIt";
import Root from "./routes/Root";

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: '/',
        element: <Home/>
      },
      {
        path: '/zippedIt',
        element: <ZippedIt/>
      }
    ]
  }
])

function App() {
  const date = new Date().getFullYear(); // will use the current year to display in the app's footer

  return (
    <div className="App">
      <div className="header">
        <h1 style={{ alignContent: "center" }}>
          <GiZipper color="#FF7F50" size={60} />
          <span style={{ color: "#FF7F50", fontSize: "50px" }}>
            <b>ZipIt</b>
          </span>
        </h1>
      </div>
      <hr />
      <RouterProvider router={router}/>
      <div className="footer" style={{ fontSize: "larger" }}>
        Joanna Salerno & Pavan Asopa&nbsp;&#169;&nbsp;{`${date}`}
      </div>
    </div>
  );
}

export default App;
