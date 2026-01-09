import Calendar from './pages/Calendar';
import SharedWithMe from './pages/SharedWithMe';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "SharedWithMe": SharedWithMe,
}

export const pagesConfig = {
    mainPage: "Calendar",
    Pages: PAGES,
    Layout: __Layout,
};