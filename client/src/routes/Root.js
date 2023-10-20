import "../App.css";
import { NavLink, Outlet } from "react-router-dom";

// css that is applied to the navlink when active
const activeStyle = {
  fontWeight: "bold",
  textDecoration: "overline",
  color: "#50B3FF",
};

export default function Root() {
  return (
    <div>
      <ul style={{ listStyleType: "none", fontSize: "x-large" }}>
        <li>
          <NavLink
            className="nav-link"
            to="/"
            style={({ isActive }) => (isActive ? activeStyle : null)}
          >
            Home
          </NavLink>
        </li>
      </ul>
      <Outlet />
    </div>
  );
}
