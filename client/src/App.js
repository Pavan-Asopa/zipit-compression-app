import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GiZipper } from "react-icons/gi";

// import routes for browser router
import Root from "./routes/Root";
import Home from "./routes/Home";
import ZippedIt from "./routes/ZippedIt";

// create browser router
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/zippedIt/:name/:time",
        element: <ZippedIt />,
      },
    ],
  },
]);

function App() {
  const date = new Date().getFullYear(); // will use the current year to display in the app's footer

  return (
    <div className="App">
      <div className="header">
        <GiZipper color="#50B3FF" size={60} />
        <h1>
          <span style={{ color: "#FF9C50", fontSize: "50px" }}>
            <b>ZipIt</b>
          </span>
        </h1>
      </div>
      <hr />
      <RouterProvider router={router} />
      <div className="footer" style={{ fontSize: "larger" }}>
        Joanna Salerno & Pavan Asopa&nbsp;&#169;&nbsp;{`${date}`}
      </div>
    </div>
  );
}

export default App;
