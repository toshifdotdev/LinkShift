export const getHost = (host : string) => {
    return host.toLowerCase().replace(/:\d+$/, "");
}