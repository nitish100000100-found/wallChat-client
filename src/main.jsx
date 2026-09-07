import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./global.css";

import LandingPage from "./pages/LandingPage.jsx";
import Chat from "./pages/Chat.jsx";
import PersonalRoom from "./pages/PersonalRoom.jsx";
import NotFound from "./pages/Not-Found.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/chat",
    element: <Chat />,
  },
  {
    path: "/personal-room",
    element: <PersonalRoom />,
  },
  {
    path: "*",
    element: <NotFound />,
  }
]);

createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
