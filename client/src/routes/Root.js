import {NavLink, Outlet} from 'react-router-dom';

export default function Root() {
    return (
        <div>
            <ul>
                <li>
                    <NavLink to='/'>Home</NavLink>
                </li>
            </ul>
            <Outlet/>
        </div>
    )
}