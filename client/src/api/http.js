// client/src/api/http.js
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
