import Calendar from './pages/Calendar';
import Privacy from './pages/Privacy';
import SharedWithMe from './pages/SharedWithMe';
import Terms from './pages/Terms';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "Privacy": Privacy,
    "SharedWithMe": SharedWithMe,
    "Terms": Terms,
}

export const pagesConfig = {
    mainPage: "Calendar",
    Pages: PAGES,
    Layout: __Layout,
};