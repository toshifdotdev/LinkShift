// Compatibility entrypoint — legacy pages import `apiFetch` from "@/api".
// New code should import from "@/api/client".
import { apiFetch } from "./client";

export default apiFetch;
export { apiFetch };
