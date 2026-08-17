export const buildUtmUrl = (
    targetUrl: string,
    utm: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmTerm?: string;
        utmContent?: string;
    }
) => {
    const url = new URL(targetUrl);

    url.searchParams.delete("utm_source");
    url.searchParams.delete("utm_medium");
    url.searchParams.delete("utm_campaign");
    url.searchParams.delete("utm_term");
    url.searchParams.delete("utm_content");

    if (utm.utmSource) {
        url.searchParams.set("utm_source", utm.utmSource);
    }

    if (utm.utmMedium) {
        url.searchParams.set("utm_medium", utm.utmMedium);
    }

    if (utm.utmCampaign) {
        url.searchParams.set("utm_campaign", utm.utmCampaign);
    }

    if (utm.utmTerm) {
        url.searchParams.set("utm_term", utm.utmTerm);
    }

    if (utm.utmContent) {
        url.searchParams.set("utm_content", utm.utmContent);
    }

    return url.toString();
};