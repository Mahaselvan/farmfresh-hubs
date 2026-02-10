import axios from "axios";

export const http = axios.create({
  baseURL: "/",
  timeout: 15000
});
