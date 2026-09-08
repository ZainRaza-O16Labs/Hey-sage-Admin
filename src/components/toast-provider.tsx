"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function ToastProvider() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={4000}
      closeButton
      pauseOnHover
      pauseOnFocusLoss
      newestOnTop
      closeOnClick={false}
      draggable={false}
      limit={5}
      theme="system"
    />
  );
}