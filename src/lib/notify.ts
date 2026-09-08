"use client";

import { toast } from "react-toastify";

const SUCCESS_AUTO_CLOSE = 4000;
const ERROR_AUTO_CLOSE = 6500;

export function notifySuccess(message: string) {
  toast.success(message, { autoClose: SUCCESS_AUTO_CLOSE });
}

export function notifyError(message: string) {
  toast.error(message, { autoClose: ERROR_AUTO_CLOSE });
}

export function notifyInfo(message: string) {
  toast.info(message, { autoClose: SUCCESS_AUTO_CLOSE });
}