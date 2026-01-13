import Calendar from './pages/Calendar';
import SharedWithMe from './pages/SharedWithMe';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "SharedWithMe": SharedWithMe,
    "Privacy": Privacy,
    "Terms": Terms,
}

export const pagesConfig = {
    mainPage: "Calendar",
    Pages: PAGES,
    Layout: __Layout,
};